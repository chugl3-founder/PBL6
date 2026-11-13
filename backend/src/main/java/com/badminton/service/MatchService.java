package com.badminton.service;

import com.badminton.common.dto.ErrorType;
import com.badminton.common.dto.MessageResponse;
import com.badminton.common.dto.PaginationMeta;
import com.badminton.common.exception.ApiException;
import com.badminton.dto.match.CreateMatchRequest;
import com.badminton.dto.match.MatchResponse;
import com.badminton.dto.match.MatchResult;
import com.badminton.dto.match.PagedMatchResponse;
import com.badminton.dto.match.UpdateMatchRequest;
import com.badminton.entity.Match;
import com.badminton.entity.User;
import com.badminton.entity.Video;
import com.badminton.repository.AiAnalysisRepository;
import com.badminton.repository.MatchRepository;
import com.badminton.repository.MatchStatisticRepository;
import com.badminton.repository.UserRepository;
import com.badminton.repository.VideoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MatchService {

    /** Thumbnail links on match cards; the list is fetched again long before this runs out. */
    private static final Duration THUMBNAIL_URL_TTL = Duration.ofHours(12);

    private final MatchRepository matchRepository;
    private final MatchAccessService matchAccess;
    private final StorageUrls storageUrls;
    private final MatchResultService matchResultService;
    private final UserRepository userRepository;
    private final VideoRepository videoRepository;
    private final AiAnalysisRepository aiAnalysisRepository;
    private final MatchStatisticRepository matchStatisticRepository;

    @Transactional
    public MatchResponse createMatch(CreateMatchRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.SYSTEM,
                        "ERR_USER_NOT_FOUND",
                        "Không tìm thấy tài khoản người dùng."
                ));

        String upper = request.getUpperPlayer() != null ? request.getUpperPlayer() : "PLAYER_A";
        String lower = request.getLowerPlayer() != null ? request.getLowerPlayer() : "PLAYER_B";

        if (upper.equals(lower)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    ErrorType.VALIDATION,
                    "ERR_INVALID_COURT_POSITION",
                    "Vị trí sân trên và sân dưới không được trùng nhau."
            );
        }

        LocalDate matchDate = request.getMatchDate() != null ? request.getMatchDate() : LocalDate.now();

        Match match = Match.builder()
                .owner(user)
                .playerAName(request.getPlayerAName().trim())
                .playerBName(request.getPlayerBName().trim())
                .upperPlayer(upper)
                .lowerPlayer(lower)
                .matchDate(matchDate)
                .title(request.getTitle() != null ? request.getTitle().trim() : null)
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .source("USER_UPLOAD")
                .status("DRAFT")
                .build();

        Match savedMatch = matchRepository.save(match);
        log.info("Đã tạo trận đấu mới: id={}, ownerId={}, status=DRAFT", savedMatch.getId(), user.getId());

        return mapToMatchResponse(savedMatch);
    }

    @Transactional(readOnly = true)
    public MatchResponse getMatchById(Long id, String userEmail) {
        Match match = matchAccess.requireOwnerOrAdmin(id, userEmail);

        return mapToMatchResponse(match);
    }

    @Transactional(readOnly = true)
    public PagedMatchResponse getMyMatches(String userEmail, String status, int page, int size) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.SYSTEM,
                        "ERR_USER_NOT_FOUND",
                        "Không tìm thấy tài khoản người dùng."
                ));

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Match> matchPage;
        if (status != null && !status.isBlank()) {
            matchPage = matchRepository.findByOwnerIdAndStatusAndDeletedAtIsNull(user.getId(), status.toUpperCase(), pageable);
        } else {
            matchPage = matchRepository.findByOwnerIdAndDeletedAtIsNull(user.getId(), pageable);
        }

        List<MatchResponse> data = mapToMatchResponses(matchPage.getContent());

        PaginationMeta pagination = PaginationMeta.builder()
                .page(matchPage.getNumber())
                .size(matchPage.getSize())
                .totalElements(matchPage.getTotalElements())
                .totalPages(matchPage.getTotalPages())
                .build();

        return PagedMatchResponse.builder()
                .data(data)
                .pagination(pagination)
                .build();
    }

    @Transactional
    @EvictsPublicReplay // public rallies depend on the starting score and the players' ends
    public MatchResponse updateMatch(Long id, UpdateMatchRequest request, String userEmail) {
        Match match = matchAccess.requireOwnerOrAdmin(id, userEmail);

        if (request.getPlayerAName() != null && !request.getPlayerAName().isBlank()) {
            match.setPlayerAName(request.getPlayerAName().trim());
        }

        if (request.getPlayerBName() != null && !request.getPlayerBName().isBlank()) {
            match.setPlayerBName(request.getPlayerBName().trim());
        }

        String targetUpper = request.getUpperPlayer() != null ? request.getUpperPlayer() : match.getUpperPlayer();
        String targetLower = request.getLowerPlayer() != null ? request.getLowerPlayer() : match.getLowerPlayer();

        if (targetUpper.equals(targetLower)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    ErrorType.VALIDATION,
                    "ERR_INVALID_COURT_POSITION",
                    "Vị trí sân trên và sân dưới không được trùng nhau."
            );
        }

        match.setUpperPlayer(targetUpper);
        match.setLowerPlayer(targetLower);

        if (request.getMatchDate() != null) {
            match.setMatchDate(request.getMatchDate());
        }

        if (request.getTitle() != null) {
            match.setTitle(request.getTitle().trim());
        }

        if (request.getDescription() != null) {
            match.setDescription(request.getDescription().trim());
        }

        if (request.getStartGame() != null) {
            match.setStartGame(request.getStartGame());
        }
        if (request.getStartScoreA() != null) {
            match.setStartScoreA(request.getStartScoreA());
        }
        if (request.getStartScoreB() != null) {
            match.setStartScoreB(request.getStartScoreB());
        }

        Match updatedMatch = matchRepository.save(match);
        log.info("Đã cập nhật thông tin trận đấu: id={}", updatedMatch.getId());

        return mapToMatchResponse(updatedMatch);
    }

    @Transactional
    @EvictsPublicReplay
    public MessageResponse softDeleteMatch(Long id, String userEmail) {
        Match match = matchAccess.requireOwnerOrAdmin(id, userEmail);

        match.setDeletedAt(OffsetDateTime.now());
        matchRepository.save(match);
        log.info("Đã xóa mềm trận đấu: id={}, deletedBy={}", id, userEmail);

        return MessageResponse.builder()
                .message("Trận đấu đã được xóa mềm thành công.")
                .build();
    }

    @Transactional(readOnly = true)
    public PagedMatchResponse getPublicMatches(String search, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;

        Page<Match> matchPage;
        if (cleanSearch != null) {
            matchPage = matchRepository.searchPublicMatches(cleanSearch, pageable);
        } else {
            matchPage = matchRepository.findByStatusAndDeletedAtIsNull("PUBLISHED", pageable);
        }

        List<MatchResponse> data = mapToMatchResponses(matchPage.getContent());

        PaginationMeta pagination = PaginationMeta.builder()
                .page(matchPage.getNumber())
                .size(matchPage.getSize())
                .totalElements(matchPage.getTotalElements())
                .totalPages(matchPage.getTotalPages())
                .build();

        return PagedMatchResponse.builder()
                .data(data)
                .pagination(pagination)
                .build();
    }

    @Transactional(readOnly = true)
    public MatchResponse getPublicMatchDetail(Long id) {
        Match match = matchRepository.findByIdAndStatusAndDeletedAtIsNull(id, "PUBLISHED")
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.SYSTEM,
                        "ERR_MATCH_NOT_FOUND",
                        "Không tìm thấy trận đấu công khai với ID: " + id
                ));

        return mapToMatchResponse(match);
    }

    public void ensurePublished(Long id) {
        if (!matchRepository.existsByIdAndStatusAndDeletedAtIsNull(id, "PUBLISHED")) {
            throw new ApiException(
                    HttpStatus.NOT_FOUND,
                    ErrorType.SYSTEM,
                    "ERR_MATCH_NOT_FOUND",
                    "Không tìm thấy trận đấu công khai với ID: " + id
            );
        }
    }

    public MatchResponse mapToMatchResponse(Match match) {
        return mapToMatchResponses(List.of(match)).get(0);
    }

    /**
     * Responses for a page of matches with three extra queries in all (videos, totals, rally scores),
     * not several per match: Supabase is ~45 ms away, so 50 matches took 9 s one by one.
     */
    public List<MatchResponse> mapToMatchResponses(List<Match> matches) {
        if (matches.isEmpty()) {
            return List.of();
        }
        List<Long> ids = matches.stream().map(Match::getId).toList();
        Map<Long, Video> videos = videoRepository.findByMatchIdIn(ids).stream()
                .collect(Collectors.toMap(v -> v.getMatch().getId(), Function.identity(), (a, b) -> a));
        Map<Long, MatchStatisticRepository.MatchTotals> totals = matchStatisticRepository.findCurrentTotalsByMatchIdIn(ids)
                .stream()
                .collect(Collectors.toMap(MatchStatisticRepository.MatchTotals::getMatchId, Function.identity(), (a, b) -> a));
        Map<Long, MatchResult> results = matchResultService.resultsFor(matches);
        return matches.stream()
                .map(m -> toResponse(m, videos.get(m.getId()), totals.get(m.getId()), results.get(m.getId())))
                .toList();
    }

    private MatchResponse toResponse(Match match, Video video, MatchStatisticRepository.MatchTotals totals,
                                     MatchResult result) {
        String youtubeVideoId = video != null ? video.getYoutubeVideoId() : null;
        BigDecimal durationSeconds = video != null ? video.getDurationSeconds() : null;
        String thumbnailUrl = youtubeVideoId != null && !youtubeVideoId.isBlank()
                ? "https://img.youtube.com/vi/" + youtubeVideoId + "/hqdefault.jpg"
                : video != null && video.getThumbnailPath() != null
                        ? storageUrls.presignedGet(video.getThumbnailPath(), THUMBNAIL_URL_TTL)
                        : null;
        Integer totalStrokes = totals != null ? totals.getTotalStrokes() : null;
        Integer totalRallies = totals != null ? totals.getTotalRallies() : null;

        return MatchResponse.builder()
                .id(match.getId())
                .ownerId(match.getOwner().getId())
                .ownerEmail(match.getOwner().getEmail())
                .playerAName(match.getPlayerAName())
                .playerBName(match.getPlayerBName())
                .upperPlayer(match.getUpperPlayer())
                .lowerPlayer(match.getLowerPlayer())
                .matchDate(match.getMatchDate())
                .startGame(match.getStartGame())
                .startScoreA(match.getStartScoreA())
                .startScoreB(match.getStartScoreB())
                .title(match.getTitle())
                .description(match.getDescription())
                .source(match.getSource())
                .status(match.getStatus())
                .thumbnailUrl(thumbnailUrl)
                .youtubeVideoId(youtubeVideoId)
                .durationSeconds(durationSeconds)
                .totalStrokes(totalStrokes)
                .totalRallies(totalRallies)
                .result(result)
                .deletedAt(match.getDeletedAt())
                .createdAt(match.getCreatedAt())
                .updatedAt(match.getUpdatedAt())
                .build();
    }

    @Transactional
    @EvictsPublicReplay
    public MatchResponse publishMatch(Long id) {
        Match match = matchRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.SYSTEM,
                        "ERR_MATCH_NOT_FOUND",
                        "Không tìm thấy trận đấu với ID: " + id
                ));

        boolean hasCompletedAnalysis = aiAnalysisRepository.findByMatchIdAndIsCurrentTrue(id)
                .map(a -> "COMPLETED".equalsIgnoreCase(a.getStatus()))
                .orElse(false);

        if (!"ANALYZED".equalsIgnoreCase(match.getStatus())
                && !"PUBLISHED".equalsIgnoreCase(match.getStatus())
                && !hasCompletedAnalysis) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    ErrorType.VALIDATION,
                    "ERR_MATCH_NOT_ANALYZED",
                    "Trận đấu chưa hoàn tất phân tích AI. Chỉ có thể xuất bản các trận đấu đã có dữ liệu phân tích."
            );
        }

        match.setStatus("PUBLISHED");
        Match saved = matchRepository.save(match);
        log.info("Admin đã xuất bản trận đấu công khai: id={}", id);
        return mapToMatchResponse(saved);
    }

    @Transactional
    @EvictsPublicReplay
    public MatchResponse unpublishMatch(Long id) {
        Match match = matchRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.SYSTEM,
                        "ERR_MATCH_NOT_FOUND",
                        "Không tìm thấy trận đấu với ID: " + id
                ));

        match.setStatus("ANALYZED");
        Match saved = matchRepository.save(match);
        log.info("Admin đã hủy xuất bản trận đấu: id={}", id);
        return mapToMatchResponse(saved);
    }

    @Transactional(readOnly = true)
    public MatchResponse getMatchByIdForAdmin(Long id) {
        Match match = matchRepository.findById(id)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.SYSTEM,
                        "ERR_MATCH_NOT_FOUND",
                        "Không tìm thấy trận đấu với ID: " + id
                ));
        return mapToMatchResponse(match);
    }

    @Transactional
    @EvictsPublicReplay
    public MessageResponse adminDeleteMatch(Long id) {
        Match match = matchRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.SYSTEM,
                        "ERR_MATCH_NOT_FOUND",
                        "Không tìm thấy trận đấu hoặc trận đấu đã bị xóa."
                ));

        if ("PUBLISHED".equalsIgnoreCase(match.getStatus())) {
            match.setStatus("ANALYZED");
        }
        match.setDeletedAt(OffsetDateTime.now());
        matchRepository.save(match);
        log.info("Admin đã xóa mềm trận đấu: id={}", id);

        return MessageResponse.builder()
                .message("Đã xóa mềm trận đấu thành công.")
                .build();
    }

    @Transactional
    public MatchResponse restoreMatch(Long id) {
        Match match = matchRepository.findById(id)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.SYSTEM,
                        "ERR_MATCH_NOT_FOUND",
                        "Không tìm thấy trận đấu với ID: " + id
                ));

        match.setDeletedAt(null);
        Match saved = matchRepository.save(match);
        log.info("Admin đã khôi phục trận đấu: id={}", id);
        return mapToMatchResponse(saved);
    }

    @Transactional(readOnly = true)
    public PagedMatchResponse getAllMatchesForAdmin(String status, boolean includeDeleted, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Match> matchPage;
        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            if ("DELETED".equalsIgnoreCase(status)) {
                matchPage = matchRepository.findByDeletedAtIsNotNull(pageable);
            } else if (includeDeleted) {
                matchPage = matchRepository.findByStatus(status.toUpperCase(), pageable);
            } else {
                matchPage = matchRepository.findByStatusAndDeletedAtIsNull(status.toUpperCase(), pageable);
            }
        } else {
            if (includeDeleted) {
                matchPage = matchRepository.findAll(pageable);
            } else {
                matchPage = matchRepository.findByDeletedAtIsNull(pageable);
            }
        }

        List<MatchResponse> data = mapToMatchResponses(matchPage.getContent());

        PaginationMeta pagination = PaginationMeta.builder()
                .page(matchPage.getNumber())
                .size(matchPage.getSize())
                .totalElements(matchPage.getTotalElements())
                .totalPages(matchPage.getTotalPages())
                .build();

        return PagedMatchResponse.builder()
                .data(data)
                .pagination(pagination)
                .build();
    }
}

