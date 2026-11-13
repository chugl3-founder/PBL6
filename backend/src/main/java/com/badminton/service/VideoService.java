package com.badminton.service;

import com.badminton.common.dto.ErrorType;
import com.badminton.common.exception.ApiException;
import com.badminton.config.S3Properties;
import com.badminton.dto.video.VideoCompleteRequest;
import com.badminton.dto.video.VideoResponse;
import com.badminton.dto.video.VideoUploadUrlRequest;
import com.badminton.dto.video.VideoUploadUrlResponse;
import com.badminton.dto.video.YoutubeVideoRequest;
import com.badminton.entity.Match;
import com.badminton.entity.Video;
import com.badminton.repository.MatchRepository;
import com.badminton.repository.VideoRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
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
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
public class VideoService {

    private final MatchRepository matchRepository;
    private final VideoRepository videoRepository;
    private final MatchAccessService matchAccess;
    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final S3Properties s3Properties;
    private final MediaJobPublisher mediaJobs;

    // Giới hạn dung lượng tối đa 500MB theo NFR-VID-01
    private static final long MAX_VIDEO_SIZE = 500L * 1024 * 1024;

    // Chỉ nhận MP4: định dạng mọi trình duyệt đều phát được trên trang Replay
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(".mp4");

    public VideoService(
            MatchRepository matchRepository,
            VideoRepository videoRepository,
            MatchAccessService matchAccess,
            S3Client s3Client,
            S3Presigner s3Presigner,
            S3Properties s3Properties,
            MediaJobPublisher mediaJobs
    ) {
        this.matchRepository = matchRepository;
        this.videoRepository = videoRepository;
        this.matchAccess = matchAccess;
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.s3Properties = s3Properties;
        this.mediaJobs = mediaJobs;
    }

    private String getVideoBucket() {
        return (s3Properties.bucket() != null && s3Properties.bucket().videos() != null)
                ? s3Properties.bucket().videos()
                : "badminton-videos";
    }

    private String getPublicUrl() {
        return s3Properties.publicUrl() != null ? s3Properties.publicUrl() : "";
    }

    /** Kiểm tra dung lượng và định dạng video, trả về phần mở rộng (vd ".mp4"). */
    private String validateVideoFile(Long matchId, String fileName, Long fileSize) {
        if (fileSize != null && fileSize > MAX_VIDEO_SIZE) {
            log.warn("Dung lượng video vượt quá 500MB: matchId={}, size={}", matchId, fileSize);
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    ErrorType.VALIDATION,
                    "ERR_VIDEO_TOO_LARGE",
                    "Dung lượng video không được vượt quá 500MB."
            );
        }

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
                    "Định dạng video không được hỗ trợ. Vui lòng chọn file MP4."
            );
        }
        return ext;
    }

    @Transactional
    public VideoUploadUrlResponse getPresignedUploadUrl(Long matchId, VideoUploadUrlRequest request, String userEmail) {
        Match match = matchAccess.requireOwnerOrAdmin(matchId, userEmail);

        // 1–2. Kiểm tra dung lượng 500MB (NFR-VID-01) và định dạng file
        String ext = validateVideoFile(matchId, request.getFileName(), request.getFileSize());

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

        video.setFileName(request.getFileName());
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
        Match match = matchAccess.requireOwnerOrAdmin(matchId, userEmail);

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
        mediaJobs.requestThumbnailAfterCommit(matchId, savedVideo.getStoragePath());

        return mapToVideoResponse(savedVideo);
    }

    @Transactional
    public VideoResponse uploadVideoDirectly(Long matchId, MultipartFile file, String userEmail) {
        Match match = matchAccess.requireOwnerOrAdmin(matchId, userEmail);

        // Đường dự phòng phải chặn giống Presigned URL, nếu không file sai định dạng vẫn lọt qua
        String fileName = file.getOriginalFilename();
        String ext = validateVideoFile(matchId, fileName, file.getSize());

        String storagePath = "matches/" + matchId + "/" + UUID.randomUUID() + ext;

        try {
            PutObjectRequest putReq = PutObjectRequest.builder()
                    .bucket(getVideoBucket())
                    .key(storagePath)
                    .build();

            s3Client.putObject(putReq, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
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
        mediaJobs.requestThumbnailAfterCommit(matchId, storagePath);

        return mapToVideoResponse(savedVideo);
    }

    /** youtube.com/watch?v=, youtu.be/, /shorts/, /live/ and /embed/ links, with or without www or m. */
    private static final Pattern YOUTUBE_ID = Pattern.compile(
            "^(?:https?://)?(?:(?:www\\.|m\\.|music\\.)?youtube\\.com/(?:watch\\?(?:.*&)?v=|shorts/|live/|embed/)|youtu\\.be/)([A-Za-z0-9_-]{11})(?:[?&#/].*)?$");

    /** The 11-character video id of a YouTube link, or empty when the link is not one. */
    public static Optional<String> parseYoutubeId(String url) {
        if (url == null) return Optional.empty();
        Matcher m = YOUTUBE_ID.matcher(url.trim());
        return m.matches() ? Optional.of(m.group(1)) : Optional.empty();
    }

    /**
     * Uses a YouTube video as the match video. Nothing is copied to storage: the AI worker downloads the
     * video itself when the analysis starts, and the replay page plays it through the YouTube player.
     */
    @Transactional
    public VideoResponse attachYoutubeVideo(Long matchId, YoutubeVideoRequest request, String userEmail) {
        Match match = matchAccess.requireOwnerOrAdmin(matchId, userEmail);

        if ("ANALYZING".equals(match.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, ErrorType.VALIDATION, "ERR_MATCH_ANALYZING",
                    "Trận đang được phân tích, không thể đổi video lúc này.");
        }
        String videoId = parseYoutubeId(request.url()).orElseThrow(() -> new ApiException(
                HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, "ERR_INVALID_YOUTUBE_URL",
                "Link không phải video YouTube. Hãy dán link dạng youtube.com/watch?v=… hoặc youtu.be/…"));
        String canonicalUrl = "https://www.youtube.com/watch?v=" + videoId;

        Video video = videoRepository.findByMatchId(matchId)
                .orElse(Video.builder().match(match).build());
        video.setVideoSourceType("YOUTUBE");
        video.setYoutubeUrl(canonicalUrl);
        video.setYoutubeVideoId(videoId);
        video.setFileName("youtube-" + videoId + ".mp4");
        video.setStoragePath("youtube/" + videoId);
        video.setFileSize(null);
        video.setStatus("READY");
        Video saved = videoRepository.save(video);

        match.setStatus("READY");
        matchRepository.save(match);

        log.info("Gắn video YouTube cho match ID={}: videoId={}", matchId, videoId);
        return mapToVideoResponse(saved);
    }

    @Transactional(readOnly = true)
    public VideoResponse getVideoByMatchId(Long matchId, String userEmail) {
        Match match = matchAccess.findActive(matchId);
        if (!"PUBLISHED".equals(match.getStatus())) {
            matchAccess.requireOwnerOrAdmin(match, userEmail);
        }

        Video video = videoRepository.findByMatchId(matchId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.SYSTEM,
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
                        ErrorType.SYSTEM,
                        "ERR_MATCH_NOT_FOUND",
                        "Không tìm thấy trận đấu công khai với ID: " + matchId
                ));

        Video video = videoRepository.findByMatchId(matchId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.SYSTEM,
                        "ERR_VIDEO_NOT_FOUND",
                        "Trận đấu này chưa có thông tin video."
                ));

        return mapToVideoResponse(video);
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
