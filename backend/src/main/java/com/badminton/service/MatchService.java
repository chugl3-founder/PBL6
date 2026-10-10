package com.badminton.service;

import com.badminton.common.dto.ErrorType;
import com.badminton.common.dto.MessageResponse;
import com.badminton.common.dto.PaginationMeta;
import com.badminton.common.exception.ApiException;
import com.badminton.dto.match.CreateMatchRequest;
import com.badminton.dto.match.MatchResponse;
import com.badminton.dto.match.PagedMatchResponse;
import com.badminton.dto.match.UpdateMatchRequest;
import com.badminton.entity.Match;
import com.badminton.entity.User;
import com.badminton.repository.MatchRepository;
import com.badminton.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MatchService {

    private final MatchRepository matchRepository;
    private final UserRepository userRepository;
    private final com.badminton.repository.VideoRepository videoRepository;
    private final com.badminton.repository.AiAnalysisRepository aiAnalysisRepository;
    private final com.badminton.repository.MatchStatisticRepository matchStatisticRepository;

    @Transactional
    public MatchResponse createMatch(CreateMatchRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.VALIDATION,
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
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.VALIDATION,
                        "ERR_USER_NOT_FOUND",
                        "Không tìm thấy tài khoản người dùng."
                ));

        Match match = matchRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.VALIDATION,
                        "ERR_MATCH_NOT_FOUND",
                        "Không tìm thấy trận đấu với ID: " + id
                ));

        boolean isAdmin = "ROLE_ADMIN".equals(user.getRole());
        boolean isOwner = match.getOwner().getId().equals(user.getId());

        if (!isAdmin && !isOwner) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    ErrorType.SYSTEM,
                    "AUTH_FORBIDDEN_RESOURCE",
                    "Bạn không có quyền truy cập trận đấu này."
            );
        }

        return mapToMatchResponse(match);
    }

    @Transactional(readOnly = true)
    public PagedMatchResponse getMyMatches(String userEmail, String status, int page, int size) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.VALIDATION,
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

        List<MatchResponse> data = matchPage.getContent().stream()
                .map(this::mapToMatchResponse)
                .toList();

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
    public MatchResponse updateMatch(Long id, UpdateMatchRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.VALIDATION,
                        "ERR_USER_NOT_FOUND",
                        "Không tìm thấy tài khoản người dùng."
                ));

        Match match = matchRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.VALIDATION,
                        "ERR_MATCH_NOT_FOUND",
                        "Không tìm thấy trận đấu với ID: " + id
                ));

        boolean isAdmin = "ROLE_ADMIN".equals(user.getRole());
        boolean isOwner = match.getOwner().getId().equals(user.getId());

        if (!isAdmin && !isOwner) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    ErrorType.SYSTEM,
                    "AUTH_FORBIDDEN_RESOURCE",
                    "Bạn không có quyền chỉnh sửa trận đấu này."
            );
        }

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

        Match updatedMatch = matchRepository.save(match);
        log.info("Đã cập nhật thông tin trận đấu: id={}", updatedMatch.getId());

        return mapToMatchResponse(updatedMatch);
    }

    @Transactional
    public MessageResponse softDeleteMatch(Long id, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.VALIDATION,
                        "ERR_USER_NOT_FOUND",
                        "Không tìm thấy tài khoản người dùng."
                ));

        Match match = matchRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        ErrorType.VALIDATION,
                        "ERR_MATCH_NOT_FOUND",
                        "Không tìm thấy trận đấu với ID: " + id
                ));

        boolean isAdmin = "ROLE_ADMIN".equals(user.getRole());
        boolean isOwner = match.getOwner().getId().equals(user.getId());

        if (!isAdmin && !isOwner) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    ErrorType.SYSTEM,
                    "AUTH_FORBIDDEN_RESOURCE",
                    "Bạn không có quyền xóa trận đấu này."
            );
        }

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

        List<MatchResponse> data = matchPage.getContent().stream()
                .map(this::mapToMatchResponse)
                .toList();

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
                        ErrorType.VALIDATION,
                        "ERR_MATCH_NOT_FOUND",
                        "Không tìm thấy trận đấu công khai với ID: " + id
                ));

        return mapToMatchResponse(match);
    }

    public MatchResponse mapToMatchResponse(Match match) {
        String thumbnailUrl = null;
        String youtubeVideoId = null;
        java.math.BigDecimal durationSeconds = null;
        Integer totalStrokes = null;
        Integer totalRallies = null;

        var videoOpt = videoRepository.findByMatchId(match.getId());
        if (videoOpt.isPresent()) {
            var v = videoOpt.get();
            youtubeVideoId = v.getYoutubeVideoId();
            durationSeconds = v.getDurationSeconds();
            if (youtubeVideoId != null && !youtubeVideoId.isBlank()) {
                thumbnailUrl = "https://img.youtube.com/vi/" + youtubeVideoId + "/hqdefault.jpg";
            }
        }

        var analysisOpt = aiAnalysisRepository.findByMatchIdAndIsCurrentTrue(match.getId());
        if (analysisOpt.isPresent()) {
            var statOpt = matchStatisticRepository.findByAnalysisId(analysisOpt.get().getId());
            if (statOpt.isPresent()) {
                totalStrokes = statOpt.get().getTotalStrokes();
                totalRallies = statOpt.get().getTotalRallies();
            }
        }

        return MatchResponse.builder()
                .id(match.getId())
                .ownerId(match.getOwner().getId())
                .playerAName(match.getPlayerAName())
                .playerBName(match.getPlayerBName())
                .upperPlayer(match.getUpperPlayer())
                .lowerPlayer(match.getLowerPlayer())
                .matchDate(match.getMatchDate())
                .title(match.getTitle())
                .description(match.getDescription())
                .source(match.getSource())
                .status(match.getStatus())
                .thumbnailUrl(thumbnailUrl)
                .youtubeVideoId(youtubeVideoId)
                .durationSeconds(durationSeconds)
                .totalStrokes(totalStrokes)
                .totalRallies(totalRallies)
                .createdAt(match.getCreatedAt())
                .updatedAt(match.getUpdatedAt())
                .build();
    }

    @Transactional
    public MatchResponse publishMatch(Long id) {
        Match match = matchRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.VALIDATION, "ERR_MATCH_NOT_FOUND", "Không tìm thấy trận đấu"));

        match.setStatus("PUBLISHED");
        Match saved = matchRepository.save(match);
        log.info("Admin đã xuất bản trận đấu công khai: id={}", id);
        return mapToMatchResponse(saved);
    }

    @Transactional
    public MatchResponse unpublishMatch(Long id) {
        Match match = matchRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.VALIDATION, "ERR_MATCH_NOT_FOUND", "Không tìm thấy trận đấu"));

        match.setStatus("READY");
        Match saved = matchRepository.save(match);
        log.info("Admin đã hủy xuất bản trận đấu: id={}", id);
        return mapToMatchResponse(saved);
    }

    @Transactional(readOnly = true)
    public PagedMatchResponse getAllMatchesForAdmin(String status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Match> matchPage;
        if (status != null && !status.isBlank()) {
            matchPage = matchRepository.findByStatusAndDeletedAtIsNull(status.toUpperCase(), pageable);
        } else {
            matchPage = matchRepository.findAll(pageable);
        }

        List<MatchResponse> data = matchPage.getContent().stream()
                .map(this::mapToMatchResponse)
                .toList();

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

