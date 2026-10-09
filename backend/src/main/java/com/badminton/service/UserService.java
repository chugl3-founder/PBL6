package com.badminton.service;

import com.badminton.common.dto.ErrorType;
import com.badminton.common.exception.ApiException;
import com.badminton.dto.auth.UserResponse;
import com.badminton.dto.user.AvatarResponse;
import com.badminton.dto.user.UpdateProfileRequest;
import com.badminton.entity.User;
import com.badminton.repository.UserRepository;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final AuthService authService;
    private final MinioClient minioClient;

    @Value("${minio.bucket.avatars:badminton-avatars}")
    private String avatarBucket;

    @Value("${minio.public-url:http://localhost:9000}")
    private String minioPublicUrl;

    private static final List<String> ALLOWED_IMAGE_TYPES = Arrays.asList(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private static final long MAX_AVATAR_SIZE = 2L * 1024 * 1024; // 2MB

    @Transactional(readOnly = true)
    public UserResponse getCurrentUserProfile(String email) {
        User user = findUserByEmail(email);
        return authService.mapToUserResponse(user);
    }

    @Transactional
    public UserResponse updateCurrentUserProfile(String email, UpdateProfileRequest request) {
        User user = findUserByEmail(email);

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getAge() != null) {
            user.setAge(request.getAge());
        }
        if (request.getGender() != null) {
            user.setGender(request.getGender());
        }
        if (request.getBadmintonLevel() != null) {
            user.setBadmintonLevel(request.getBadmintonLevel());
        }

        User updatedUser = userRepository.save(user);
        log.info("Cập nhật thông tin profile thành công: userId={}, email={}", updatedUser.getId(), email);

        return authService.mapToUserResponse(updatedUser);
    }

    @Transactional
    public AvatarResponse uploadAvatar(String email, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    ErrorType.VALIDATION,
                    "ERR_EMPTY_FILE",
                    "File ảnh đại diện không được để trống."
            );
        }

        // 1. Kiểm tra dung lượng tối đa 2MB
        if (file.getSize() > MAX_AVATAR_SIZE) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    ErrorType.VALIDATION,
                    "ERR_FILE_TOO_LARGE",
                    "Dung lượng ảnh đại diện vượt quá giới hạn tối đa 2MB."
            );
        }

        // 2. Kiểm tra định dạng MIME type
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType.toLowerCase())) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    ErrorType.VALIDATION,
                    "ERR_INVALID_FILE_TYPE",
                    "Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPG, PNG hoặc WebP."
            );
        }

        User user = findUserByEmail(email);

        try {
            // Đảm bảo bucket tồn tại
            boolean bucketExists = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(avatarBucket).build()
            );
            if (!bucketExists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(avatarBucket).build());
            }

            // Đặt tên file duy nhất theo UUID
            String originalFilename = file.getOriginalFilename();
            String extension = ".jpg";
            if (originalFilename != null && originalFilename.lastIndexOf(".") != -1) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String objectName = "user-" + user.getId() + "-" + UUID.randomUUID() + extension;

            // Upload lên MinIO
            try (InputStream is = file.getInputStream()) {
                minioClient.putObject(
                        PutObjectArgs.builder()
                                .bucket(avatarBucket)
                                .object(objectName)
                                .stream(is, file.getSize(), -1)
                                .contentType(contentType)
                                .build()
                );
            }

            // Tạo public URL truy cập avatar
            String avatarUrl = minioPublicUrl + "/" + avatarBucket + "/" + objectName;

            user.setAvatarUrl(avatarUrl);
            userRepository.save(user);

            log.info("Upload avatar thành công cho userId={}: {}", user.getId(), avatarUrl);

            return AvatarResponse.builder()
                    .avatarUrl(avatarUrl)
                    .build();

        } catch (Exception e) {
            log.error("Lỗi khi upload avatar lên MinIO cho user {}: {}", email, e.getMessage(), e);
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    ErrorType.SYSTEM,
                    "ERR_STORAGE_FAILURE",
                    "Không thể lưu trữ ảnh đại diện. Vui lòng thử lại sau."
            );
        }
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.VALIDATION,
                        "ERR_USER_NOT_FOUND",
                        "Không tìm thấy thông tin người dùng."
                ));
    }
}
