package com.badminton.service;

import com.badminton.common.exception.ApiException;
import com.badminton.common.exception.ErrorCodes;
import com.badminton.entity.Match;
import com.badminton.repository.MatchRepository;
import com.badminton.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * The one place that decides who may act on a match. Loads the match with its owner in one query; the user is
 * only looked up when they are not the owner, to see if they are an admin.
 */
@Service
@RequiredArgsConstructor
public class MatchAccessService {

    private static final String ROLE_ADMIN = "ROLE_ADMIN";

    private final MatchRepository matchRepository;
    private final UserRepository userRepository;

    /** A match that is not deleted, or 404. */
    public Match findActive(Long matchId) {
        return matchRepository.findWithOwnerByIdAndDeletedAtIsNull(matchId)
                .orElseThrow(() -> ApiException.notFound(ErrorCodes.MATCH_NOT_FOUND,
                        "Không tìm thấy trận đấu với ID: " + matchId));
    }

    /** Only the owner: creating highlight reels, starting an analysis. */
    public Match requireOwner(Long matchId, String email) {
        Match match = findActive(matchId);
        if (!isOwner(match, email)) {
            throw ApiException.forbidden("Bạn không có quyền thao tác trên trận đấu này.");
        }
        return match;
    }

    /** The owner or an admin: reading, editing and deleting the match and its analysis. */
    public Match requireOwnerOrAdmin(Long matchId, String email) {
        Match match = findActive(matchId);
        requireOwnerOrAdmin(match, email);
        return match;
    }

    public void requireOwnerOrAdmin(Match match, String email) {
        if (!isOwner(match, email) && !isAdmin(email)) {
            throw ApiException.forbidden("Bạn không có quyền thao tác trên trận đấu này.");
        }
    }

    private static boolean isOwner(Match match, String email) {
        return email != null && match.getOwner() != null && email.equalsIgnoreCase(match.getOwner().getEmail());
    }

    private boolean isAdmin(String email) {
        return email != null && userRepository.findByEmail(email)
                .map(u -> ROLE_ADMIN.equals(u.getRole()))
                .orElse(false);
    }
}
