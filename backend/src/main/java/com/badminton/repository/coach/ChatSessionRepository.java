package com.badminton.repository.coach;

import com.badminton.entity.coach.ChatSession;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, UUID> {

    /** The user's conversations, newest first; matchId null means every match. */
    @Query("SELECT s FROM ChatSession s WHERE s.userId = :userId AND (:matchId IS NULL OR s.matchId = :matchId) "
            + "ORDER BY s.createdAt DESC")
    List<ChatSession> findOfUser(@Param("userId") Long userId, @Param("matchId") Long matchId, Pageable page);

    /** A guest browser's conversations; sessions of signed-in users are never listed by browser key. */
    @Query("SELECT s FROM ChatSession s WHERE s.userId IS NULL AND s.browserKey = :browserKey "
            + "AND (:matchId IS NULL OR s.matchId = :matchId) ORDER BY s.createdAt DESC")
    List<ChatSession> findOfGuest(@Param("browserKey") String browserKey, @Param("matchId") Long matchId, Pageable page);
}
