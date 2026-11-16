package com.badminton.service;

import com.badminton.common.dto.ErrorType;
import com.badminton.common.exception.ApiException;
import com.badminton.dto.player.PlayerProfileResponse;
import com.badminton.dto.scouting.ScoutingPlan;
import com.badminton.dto.scouting.ScoutingReportRequest;
import com.badminton.dto.scouting.ScoutingReportResponse;
import com.badminton.entity.ScoutingReport;
import com.badminton.entity.User;
import com.badminton.repository.PlayerStatsRepository;
import com.badminton.repository.ScoutingReportRepository;
import com.badminton.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Locale;

/**
 * Scouting reports: a game plan against one opponent, built from the matches the owner may see
 * and stored as a snapshot. "Regenerate" rebuilds it from the current data; coach notes are kept.
 */
@Service
@RequiredArgsConstructor
public class ScoutingService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final ScoutingReportRepository scoutingReportRepository;
    private final UserRepository userRepository;
    private final PlayerProfileService playerProfileService;
    private final PlayerStatsRepository playerStatsRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<ScoutingReportResponse> list(String email) {
        User owner = user(email);
        return scoutingReportRepository.findByOwnerIdOrderByUpdatedAtDesc(owner.getId()).stream()
                .map(r -> toResponse(r, true, false))
                .toList();
    }

    @Transactional
    public ScoutingReportResponse create(String email, ScoutingReportRequest.Create request) {
        User owner = user(email);
        String opponent = request.opponentName().trim();
        String own = blankToNull(request.ownPlayerName());
        if (own != null && own.equalsIgnoreCase(opponent)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, "ERR_SAME_PLAYER",
                    "Vận động viên của bạn và đối thủ phải khác nhau");
        }
        ScoutingPlan plan = buildPlan(owner, opponent, own);
        String title = blankToNull(request.title());
        ScoutingReport report = ScoutingReport.builder()
                .owner(owner)
                .title(title != null ? title : (own != null ? own + " gặp " : "Trinh sát ") + plan.opponent().name())
                .opponentName(plan.opponent().name())
                .ownPlayerName(plan.ownPlayer() != null ? plan.ownPlayer().name() : own)
                .planData(write(plan))
                .generatedAt(OffsetDateTime.now())
                .build();
        return toResponse(scoutingReportRepository.save(report), true, true);
    }

    @Transactional(readOnly = true)
    public ScoutingReportResponse get(String email, Long id) {
        return toResponse(owned(email, id), true, true);
    }

    @Transactional
    public ScoutingReportResponse update(String email, Long id, ScoutingReportRequest.Update request) {
        ScoutingReport report = owned(email, id);
        if (request.title() != null) {
            String title = request.title().trim();
            if (title.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, "ERR_INVALID_TITLE",
                        "Tiêu đề không được để trống");
            }
            report.setTitle(title);
        }
        if (request.coachNotes() != null) {
            report.setCoachNotes(request.coachNotes().isBlank() ? null : request.coachNotes());
        }
        return toResponse(scoutingReportRepository.save(report), true, true);
    }

    @Transactional
    public ScoutingReportResponse regenerate(String email, Long id) {
        ScoutingReport report = owned(email, id);
        ScoutingPlan plan = buildPlan(report.getOwner(), report.getOpponentName(), report.getOwnPlayerName());
        report.setPlanData(write(plan));
        report.setGeneratedAt(OffsetDateTime.now());
        return toResponse(scoutingReportRepository.save(report), true, true);
    }

    @Transactional
    public ScoutingReportResponse share(String email, Long id) {
        ScoutingReport report = owned(email, id);
        if (report.getShareToken() == null) {
            byte[] bytes = new byte[24];
            RANDOM.nextBytes(bytes);
            report.setShareToken(Base64.getUrlEncoder().withoutPadding().encodeToString(bytes));
        }
        return toResponse(scoutingReportRepository.save(report), true, true);
    }

    @Transactional
    public ScoutingReportResponse unshare(String email, Long id) {
        ScoutingReport report = owned(email, id);
        report.setShareToken(null);
        return toResponse(scoutingReportRepository.save(report), true, true);
    }

    @Transactional
    public void delete(String email, Long id) {
        scoutingReportRepository.delete(owned(email, id));
    }

    /** Read-only view by share link; clips from the owner's private matches are left out. */
    @Transactional(readOnly = true)
    public ScoutingReportResponse getShared(String token) {
        ScoutingReport report = scoutingReportRepository.findByShareToken(token)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.SYSTEM, "ERR_REPORT_NOT_FOUND",
                        "Link chia sẻ không tồn tại hoặc đã bị tắt"));
        return toResponse(report, false, true);
    }

    /* ------------------------------------------------------------------ helpers */

    private ScoutingPlan buildPlan(User owner, String opponentName, String ownName) {
        String email = owner.getEmail();
        PlayerProfileResponse opponent = playerProfileService.getProfile(email, opponentName);
        PlayerProfileResponse own = null;
        if (ownName != null) {
            try {
                own = playerProfileService.getProfile(email, ownName);
            } catch (ApiException e) {
                if (e.getStatus() != HttpStatus.NOT_FOUND) throw e;
                // Our own player may have no match yet: the plan is still useful without a comparison.
            }
        }
        var ends = playerStatsRepository.findRallyEnds(owner.getId(), opponentName.trim().toLowerCase(Locale.ROOT));
        return ScoutingPlanBuilder.build(opponent, own, ends);
    }

    private ScoutingReportResponse toResponse(ScoutingReport r, boolean owner, boolean withPlan) {
        ScoutingPlan plan = withPlan ? read(r.getPlanData()) : null;
        if (plan != null && !owner) {
            plan = new ScoutingPlan(plan.opponent(), plan.ownPlayer(), plan.headToHead(),
                    plan.keys().stream().map(k -> new ScoutingPlan.KeyPoint(k.category(), k.title(), k.detail(),
                            k.evidence(), k.clips().stream().filter(ScoutingPlan.Clip::published).toList())).toList(),
                    plan.targetZones(), plan.threatZones(), plan.threats(), plan.weaknesses(), plan.rallyLength(),
                    plan.quality());
        }
        return new ScoutingReportResponse(r.getId(), r.getTitle(), r.getOpponentName(), r.getOwnPlayerName(),
                r.getCoachNotes(), owner ? r.getShareToken() : null, owner, r.getGeneratedAt(), r.getUpdatedAt(), plan);
    }

    private ScoutingReport owned(String email, Long id) {
        return scoutingReportRepository.findByIdAndOwnerId(id, user(email).getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.SYSTEM, "ERR_REPORT_NOT_FOUND",
                        "Không tìm thấy báo cáo trinh sát"));
    }

    private User user(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, ErrorType.VALIDATION, "ERR_USER_NOT_FOUND",
                        "Người dùng không tồn tại"));
    }

    private String write(ScoutingPlan plan) {
        try {
            return objectMapper.writeValueAsString(plan);
        } catch (JsonProcessingException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, ErrorType.SYSTEM, "ERR_SCOUTING_SERIALIZE_FAILED",
                    "Không lưu được báo cáo");
        }
    }

    private ScoutingPlan read(String json) {
        try {
            return objectMapper.readValue(json, ScoutingPlan.class);
        } catch (JsonProcessingException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, ErrorType.SYSTEM, "ERR_SCOUTING_READ_FAILED",
                    "Không đọc được báo cáo");
        }
    }

    private static String blankToNull(String text) {
        return text == null || text.isBlank() ? null : text.trim();
    }
}
