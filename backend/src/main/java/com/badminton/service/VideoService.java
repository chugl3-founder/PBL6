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
import com.badminton.config.S3Properties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Slf4j
@Service
public class VideoService {

    private final MatchRepository matchRepository;
    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final S3Properties s3Properties;

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
            S3Client s3Client,
            S3Presigner s3Presigner,
            S3Properties s3Properties
    ) {
        this.matchRepository = matchRepository;
        this.videoRepository = videoRepository;
        this.userRepository = userRepository;
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.s3Properties = s3Properties;
    }

    private String getVideoBucket() {
        return (s3Properties.bucket() != null && s3Properties.bucket().videos() != null)
                ? s3Properties.bucket().videos()
                : "badminton-videos";
    }

    private String getPublicUrl() {
        return s3Properties.publicUrl() != null ? s3Properties.publicUrl() : "";
    }

    @Transactional
    public VideoUploadUrlResponse getPresignedUploadUrl(Long matchId, VideoUploadUrlRequest request, String userEmail) {
        User user = findUserByEmail(userEmail);
        Match match = findMatchById(matchId);
        checkOwnership(match, user);

        // 1. Kiểm tra giới hạn dung lượng 500MB (NFR-VID-01)
        if (request.getFileSize() != null && request.getFileSize() > MAX_VIDEO_SIZE) {
            log.warn("Dung lượng video vượt quá 500MB: matchId={}, size={}", matchId, request.getFileSize());
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    ErrorType.VALIDATION,
                    "ERR_VIDEO_TOO_LARGE",
                    "Dung lượng video không được vượt quá 500MB."
            );
        }

        // 2. Kiểm tra định dạng file mở rộng
        String fileName = request.getFileName();
        String ext = "";
        if (fileName != null && fileName.lastIndexOf(".") != -1) {
            ext = fileName.substring(fileName.lastIndexOf(".")).toLowerCase(Locale.ROOT);
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
            PutObjectRequest putReq = PutObjectRequest.builder()
                    .bucket(getVideoBucket())
                    .key(storagePath)
                    .build();

            PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(15))
                    .putObjectRequest(putReq)
                    .build();

            uploadUrl = s3Presigner.presignPutObject(presignRequest).url().toString();
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

        // 1. Kiểm tra sự tồn tại thực tế của file trên S3
        HeadObjectResponse stat;
        try {
            stat = s3Client.headObject(
                    HeadObjectRequest.builder()
                            .bucket(getVideoBucket())
                            .key(request.getStoragePath())
                            .build()
            );
        } catch (Exception e) {
            log.error("Kiểm tra file trên S3 thất bại: bucket={}, path={}, err={}",
                    getVideoBucket(), request.getStoragePath(), e.getMessage());
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
        video.setFileSize(stat.contentLength() != null ? stat.contentLength() : request.getFileSize());
        video.setStatus("READY");
        Video savedVideo = videoRepository.save(video);

        // 3. Chuyển trạng thái trận đấu sang READY
        match.setStatus("READY");
        matchRepository.save(match);

        log.info("Xác nhận hoàn tất upload video cho match ID={}: size={} bytes", matchId, stat.contentLength());

        return mapToVideoResponse(savedVideo);
    }

    @Transactional
    public VideoResponse uploadVideoDirectly(Long matchId, org.springframework.web.multipart.MultipartFile file, String userEmail) {
        User user = findUserByEmail(userEmail);
        Match match = findMatchById(matchId);
        checkOwnership(match, user);

        String fileName = file.getOriginalFilename();
        String ext = "";
        if (fileName != null && fileName.lastIndexOf(".") != -1) {
            ext = fileName.substring(fileName.lastIndexOf(".")).toLowerCase(Locale.ROOT);
        }

        String storagePath = "matches/" + matchId + "/" + UUID.randomUUID() + ext;

        try {
            PutObjectRequest putReq = PutObjectRequest.builder()
                    .bucket(getVideoBucket())
                    .key(storagePath)
                    .build();

            s3Client.putObject(putReq, software.amazon.awssdk.core.sync.RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        } catch (Exception e) {
            log.error("Tải video lên S3 trực tiếp thất bại: matchId={}, err={}", matchId, e.getMessage(), e);
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    ErrorType.SYSTEM,
                    "ERR_S3_UPLOAD_FAILED",
                    "Không thể lưu trữ file video lên hệ thống Cloud."
            );
        }

        Video video = videoRepository.findByMatchId(matchId)
                .orElse(Video.builder()
                        .match(match)
                        .build());

        video.setFileName(fileName != null ? fileName : "video.mp4");
        video.setStoragePath(storagePath);
        video.setFileSize(file.getSize());
        video.setStatus("READY");
        Video savedVideo = videoRepository.save(video);

        match.setStatus("READY");
        matchRepository.save(match);

        log.info("Xác nhận tải video trực tiếp thành công cho match ID={}: storagePath={}, size={}",
                matchId, storagePath, file.getSize());

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
        boolean isOwner = match.getOwner() != null && match.getOwner().getId().equals(user.getId());

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
                GetObjectRequest getReq = GetObjectRequest.builder()
                        .bucket(getVideoBucket())
                        .key(video.getStoragePath())
                        .build();

                GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                        .signatureDuration(Duration.ofDays(7))
                        .getObjectRequest(getReq)
                        .build();

                videoUrl = s3Presigner.presignGetObject(presignRequest).url().toString();
            } catch (Exception e) {
                log.warn("Không thể sinh Presigned GET URL cho video, dùng direct public URL: {}", e.getMessage());
                videoUrl = getPublicUrl() + "/" + getVideoBucket() + "/" + video.getStoragePath();
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
