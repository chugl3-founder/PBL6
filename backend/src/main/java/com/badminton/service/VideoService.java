package com.badminton.service;

import com.badminton.common.dto.ErrorType;
import com.badminton.common.exception.ApiException;
import com.badminton.dto.video.VideoCompleteRequest;
import com.badminton.dto.video.VideoResponse;
import com.badminton.dto.video.VideoUploadUrlRequest;
import com.badminton.dto.video.VideoUploadUrlResponse;
import com.badminton.entity.Match;
import com.badminton.entity.User;
import com.badminton.entity.Video;
import com.badminton.repository.MatchRepository;
import com.badminton.repository.UserRepository;
import com.badminton.repository.VideoRepository;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.StatObjectArgs;
import io.minio.StatObjectResponse;
import io.minio.http.Method;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class VideoService {

    private final MatchRepository matchRepository;
    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final MinioClient minioClient;
    private final MinioClient minioPresignerClient;

    @Value("${minio.bucket.videos:badminton-videos}")
    private String videoBucket;

    @Value("${minio.public-url:http://localhost:9000}")
    private String minioPublicUrl;

    // Giới hạn dung lượng tối đa 500MB theo NFR-VID-01
    private static final long MAX_VIDEO_SIZE = 500L * 1024 * 1024;

    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
            ".mp4",
            ".mov",
            ".mkv",
            ".webm",
            ".avi"
    );

    public VideoService(
            MatchRepository matchRepository,
            VideoRepository videoRepository,
            UserRepository userRepository,
            @Qualifier("minioClient") MinioClient minioClient,
            @Qualifier("minioPresignerClient") MinioClient minioPresignerClient
    ) {
        this.matchRepository = matchRepository;
        this.videoRepository = videoRepository;
        this.userRepository = userRepository;
        this.minioClient = minioClient;
        this.minioPresignerClient = minioPresignerClient;
    }

    @Transactional
    public VideoUploadUrlResponse getPresignedUploadUrl(Long matchId, VideoUploadUrlRequest request, String userEmail) {
        User user = findUserByEmail(userEmail);
        Match match = findMatchById(matchId);
        checkOwnership(match, user);

        // 1. Kiểm tra giới hạn dung lượng 500MB (NFR-VID-01)
        if (request.getFileSize() > MAX_VIDEO_SIZE) {
            log.warn("Dung lượng video vượt quá 500MB: matchId={}, size={}", matchId, request.getFileSize());
            throw new ApiException(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    ErrorType.VALIDATION,
                    "ERR_PAYLOAD_TOO_LARGE",
                    "Dung lượng video vượt quá giới hạn tối đa cho phép (500MB)."
            );
        }

        // 2. Kiểm tra định dạng phần mở rộng
        String fileName = request.getFileName().trim();
        String ext = "";
        int dotIdx = fileName.lastIndexOf('.');
        if (dotIdx >= 0) {
            ext = fileName.substring(dotIdx).toLowerCase(Locale.ROOT);
        }

        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            log.warn("Định dạng video không được hỗ trợ: matchId={}, fileName={}", matchId, fileName);
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    ErrorType.VALIDATION,
                    "ERR_INVALID_FILE_TYPE",
                    "Định dạng video không được hỗ trợ. Vui lòng chọn file MP4, MOV, MKV hoặc WebM."
            );
        }

        // 3. Tạo đường dẫn lưu trữ độc nhất
        String storagePath = "matches/" + matchId + "/" + UUID.randomUUID() + ext;

        // 4. Sinh S3 Presigned PUT URL thời hạn 15 phút (900s)
        String uploadUrl;
        try {
            uploadUrl = minioPresignerClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.PUT)
                            .bucket(videoBucket)
                            .object(storagePath)
                            .region("us-east-1")
                            .expiry(15, TimeUnit.MINUTES)
                            .build()
            );
        } catch (Exception e) {
            log.error("Không thể sinh Presigned Upload URL: matchId={}, err={}", matchId, e.getMessage(), e);
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    ErrorType.SYSTEM,
                    "ERR_S3_PRESIGN_FAILED",
                    "Lỗi hệ thống: Không thể khởi tạo liên kết tải lên video."
            );
        }

        // 5. Khởi tạo/cập nhật bản ghi video ở trạng thái UPLOADING
        Video video = videoRepository.findByMatchId(matchId)
                .orElse(Video.builder()
                        .match(match)
                        .build());

        video.setFileName(fileName);
        video.setStoragePath(storagePath);
        video.setFileSize(request.getFileSize());
        video.setMimeType(request.getMimeType() != null ? request.getMimeType() : "video/mp4");
        video.setStatus("UPLOADING");
        videoRepository.save(video);

        log.info("Đã sinh Presigned Upload URL cho match ID={}: storagePath={}", matchId, storagePath);

        return VideoUploadUrlResponse.builder()
                .uploadUrl(uploadUrl)
                .storagePath(storagePath)
                .expiresInSeconds(900)
                .build();
    }

    @Transactional
    public VideoResponse completeVideoUpload(Long matchId, VideoCompleteRequest request, String userEmail) {
        User user = findUserByEmail(userEmail);
        Match match = findMatchById(matchId);
        checkOwnership(match, user);

        // 1. Kiểm tra sự tồn tại thực tế của file trên MinIO
        StatObjectResponse stat;
        try {
            stat = minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(videoBucket)
                            .object(request.getStoragePath())
                            .build()
            );
        } catch (Exception e) {
            log.error("Kiểm tra file trên MinIO thất bại: bucket={}, path={}, err={}",
                    videoBucket, request.getStoragePath(), e.getMessage());
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    ErrorType.VALIDATION,
                    "ERR_VIDEO_FILE_NOT_FOUND",
                    "Không tìm thấy file video trên hệ thống lưu trữ. Vui lòng tải lên lại."
            );
        }

        // 2. Cập nhật bản ghi video sang trạng thái READY
        Video video = videoRepository.findByMatchId(matchId)
                .orElse(Video.builder()
                        .match(match)
                        .build());

        video.setFileName(request.getFileName().trim());
        video.setStoragePath(request.getStoragePath().trim());
        video.setFileSize(stat.size());
        video.setStatus("READY");
        Video savedVideo = videoRepository.save(video);

        // 3. Chuyển trạng thái trận đấu sang READY
        match.setStatus("READY");
        matchRepository.save(match);

        log.info("Xác nhận hoàn tất upload video cho match ID={}: size={} bytes", matchId, stat.size());

        return mapToVideoResponse(savedVideo);
    }

    @Transactional(readOnly = true)
    public VideoResponse getVideoByMatchId(Long matchId, String userEmail) {
        User user = findUserByEmail(userEmail);
        Match match = findMatchById(matchId);

        boolean isPublic = "PUBLISHED".equals(match.getStatus());
        if (!isPublic) {
            checkOwnership(match, user);
        }

        Video video = videoRepository.findByMatchId(matchId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.VALIDATION,
                        "ERR_VIDEO_NOT_FOUND",
                        "Trận đấu này chưa có video được tải lên."
                ));

        return mapToVideoResponse(video);
    }

    @Transactional(readOnly = true)
    public VideoResponse getPublicVideoByMatchId(Long matchId) {
        Match match = matchRepository.findByIdAndStatusAndDeletedAtIsNull(matchId, "PUBLISHED")
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.VALIDATION,
                        "ERR_MATCH_NOT_FOUND",
                        "Không tìm thấy trận đấu công khai với ID: " + matchId
                ));

        Video video = videoRepository.findByMatchId(matchId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.VALIDATION,
                        "ERR_VIDEO_NOT_FOUND",
                        "Trận đấu này chưa có thông tin video."
                ));

        return mapToVideoResponse(video);
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.VALIDATION,
                        "ERR_USER_NOT_FOUND",
                        "Không tìm thấy tài khoản người dùng."
                ));
    }

    private Match findMatchById(Long id) {
        return matchRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.VALIDATION,
                        "ERR_MATCH_NOT_FOUND",
                        "Không tìm thấy trận đấu với ID: " + id
                ));
    }

    private void checkOwnership(Match match, User user) {
        boolean isAdmin = "ROLE_ADMIN".equals(user.getRole());
        boolean isOwner = match.getOwner().getId().equals(user.getId());

        if (!isAdmin && !isOwner) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    ErrorType.SYSTEM,
                    "AUTH_FORBIDDEN_RESOURCE",
                    "Bạn không có quyền thao tác trên video của trận đấu này."
            );
        }
    }

    public VideoResponse mapToVideoResponse(Video video) {
        String videoUrl;
        if ("YOUTUBE".equalsIgnoreCase(video.getVideoSourceType())) {
            videoUrl = video.getYoutubeUrl();
        } else {
            try {
                videoUrl = minioPresignerClient.getPresignedObjectUrl(
                        GetPresignedObjectUrlArgs.builder()
                                .method(Method.GET)
                                .bucket(videoBucket)
                                .object(video.getStoragePath())
                                .region("us-east-1")
                                .expiry(7, TimeUnit.DAYS)
                                .build()
                );
            } catch (Exception e) {
                log.warn("Không thể sinh Presigned GET URL cho video, dùng direct public URL: {}", e.getMessage());
                videoUrl = minioPublicUrl + "/" + videoBucket + "/" + video.getStoragePath();
            }
        }

        return VideoResponse.builder()
                .id(video.getId())
                .matchId(video.getMatch().getId())
                .fileName(video.getFileName())
                .storagePath(video.getStoragePath())
                .videoUrl(videoUrl)
                .videoSourceType(video.getVideoSourceType() != null ? video.getVideoSourceType() : "MINIO_UPLOAD")
                .youtubeUrl(video.getYoutubeUrl())
                .youtubeVideoId(video.getYoutubeVideoId())
                .mimeType(video.getMimeType())
                .fileSize(video.getFileSize())
                .durationSeconds(video.getDurationSeconds())
                .width(video.getWidth())
                .height(video.getHeight())
                .fps(video.getFps())
                .status(video.getStatus())
                .createdAt(video.getCreatedAt())
                .updatedAt(video.getUpdatedAt())
                .build();
    }
}
