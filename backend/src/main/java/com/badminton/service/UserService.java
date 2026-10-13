package com.badminton.service;

import com.badminton.common.dto.ErrorType;
import com.badminton.common.exception.ApiException;
import com.badminton.dto.auth.UserResponse;
import com.badminton.dto.user.AvatarResponse;
import com.badminton.dto.user.UpdateProfileRequest;
import com.badminton.entity.User;
import com.badminton.repository.UserRepository;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import com.badminton.config.S3Properties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final AuthService authService;
    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final S3Properties s3Properties;

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
            // Đặt tên file duy nhất theo UUID
            String originalFilename = file.getOriginalFilename();
            String extension = ".jpg";
            if (originalFilename != null && originalFilename.lastIndexOf(".") != -1) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String objectName = "user-" + user.getId() + "-" + UUID.randomUUID() + extension;

            String avatarBucket = (s3Properties.bucket() != null && s3Properties.bucket().avatars() != null)
                    ? s3Properties.bucket().avatars()
                    : "badminton-avatars";
            String publicUrl = s3Properties.publicUrl() != null ? s3Properties.publicUrl() : "";

            // Upload lên S3
            PutObjectRequest putReq = PutObjectRequest.builder()
                    .bucket(avatarBucket)
                    .key(objectName)
                    .contentType(contentType)
                    .build();

            try (InputStream is = file.getInputStream()) {
                s3Client.putObject(putReq, RequestBody.fromInputStream(is, file.getSize()));
            }

            // Tạo presigned GET URL truy cập avatar (7 ngày)
            String avatarUrl;
            try {
                GetObjectRequest getReq = GetObjectRequest.builder()
                        .bucket(avatarBucket)
                        .key(objectName)
                        .build();
                avatarUrl = s3Presigner.presignGetObject(
                        GetObjectPresignRequest.builder()
                                .signatureDuration(Duration.ofDays(7))
                                .getObjectRequest(getReq)
                                .build()
                ).url().toString();
            } catch (Exception ex) {
                avatarUrl = publicUrl + "/" + avatarBucket + "/" + objectName;
            }

            user.setAvatarUrl(avatarUrl);
            userRepository.save(user);

            log.info("Upload avatar thành công cho userId={}: {}", user.getId(), avatarUrl);

            return AvatarResponse.builder()
                    .avatarUrl(avatarUrl)
                    .build();

        } catch (Exception e) {
            log.error("Lỗi khi upload avatar lên S3 cho user {}: {}", email, e.getMessage(), e);
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

    @Transactional(readOnly = true)
    public com.badminton.dto.admin.PagedUserResponse getAllUsersForAdmin(String search, String status, int page, int size) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                page,
                size,
                org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt")
        );
        String cleanSearch = (search != null) ? search.trim() : "";

        org.springframework.data.domain.Page<User> userPage;
        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            userPage = userRepository.searchUsersByStatus(status.trim().toUpperCase(), cleanSearch, pageable);
        } else {
            userPage = userRepository.searchUsers(cleanSearch, pageable);
        }

        List<UserResponse> data = userPage.getContent().stream()
                .map(authService::mapToUserResponse)
                .toList();

        com.badminton.common.dto.PaginationMeta pagination = com.badminton.common.dto.PaginationMeta.builder()
                .page(userPage.getNumber())
                .size(userPage.getSize())
                .totalElements(userPage.getTotalElements())
                .totalPages(userPage.getTotalPages())
                .build();

        return com.badminton.dto.admin.PagedUserResponse.builder()
                .data(data)
                .pagination(pagination)
                .build();
    }

    @Transactional(readOnly = true)
    public UserResponse getUserByIdForAdmin(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.VALIDATION,
                        "ERR_USER_NOT_FOUND",
                        "Không tìm thấy người dùng với ID: " + id
                ));
        return authService.mapToUserResponse(user);
    }

    @Transactional
    public UserResponse updateUserStatusForAdmin(Long id, String targetStatus, String adminEmail) {
        if (targetStatus == null || (!"ACTIVE".equalsIgnoreCase(targetStatus.trim()) && !"LOCKED".equalsIgnoreCase(targetStatus.trim()))) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    ErrorType.VALIDATION,
                    "ERR_INVALID_USER_STATUS",
                    "Trạng thái không hợp lệ. Chỉ chấp nhận ACTIVE hoặc LOCKED."
            );
        }

        String normalizedStatus = targetStatus.trim().toUpperCase();

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.VALIDATION,
                        "ERR_USER_NOT_FOUND",
                        "Không tìm thấy người dùng với ID: " + id
                ));

        if (user.getEmail().equalsIgnoreCase(adminEmail) && "LOCKED".equals(normalizedStatus)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    ErrorType.VALIDATION,
                    "ERR_CANNOT_LOCK_SELF",
                    "Quản trị viên không thể tự khóa tài khoản của chính mình."
            );
        }

        user.setStatus(normalizedStatus);
        User saved = userRepository.save(user);
        log.info("Admin {} đã cập nhật trạng thái tài khoản userId={} ({}) thành {}", adminEmail, id, user.getEmail(), normalizedStatus);

        return authService.mapToUserResponse(saved);
    }
}
