package com.badminton.repository.match;

import com.badminton.entity.match.Match;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MatchRepository extends JpaRepository<Match, Long> {

    Optional<Match> findByIdAndDeletedAtIsNull(Long id);

    /** Every match, deleted or not, with its owner (admin list). */
    @Override
    @EntityGraph(attributePaths = "owner")
    Page<Match> findAll(Pageable pageable);

    /** The match with its owner in one query, for access checks. */
    @EntityGraph(attributePaths = "owner")
    Optional<Match> findWithOwnerByIdAndDeletedAtIsNull(Long id);

    @EntityGraph(attributePaths = "owner")
    Page<Match> findByDeletedAtIsNull(Pageable pageable);

    @EntityGraph(attributePaths = "owner")
    Page<Match> findByDeletedAtIsNotNull(Pageable pageable);

    @EntityGraph(attributePaths = "owner")
    Page<Match> findByStatus(String status, Pageable pageable);

    @EntityGraph(attributePaths = "owner")
    Page<Match> findByOwnerIdAndDeletedAtIsNull(Long ownerId, Pageable pageable);

    @EntityGraph(attributePaths = "owner")
    Page<Match> findByOwnerIdAndStatusAndDeletedAtIsNull(Long ownerId, String status, Pageable pageable);

    @EntityGraph(attributePaths = "owner")
    Page<Match> findByStatusAndDeletedAtIsNull(String status, Pageable pageable);

    Optional<Match> findByIdAndStatusAndDeletedAtIsNull(Long id, String status);

    boolean existsByIdAndStatusAndDeletedAtIsNull(Long id, String status);

    @EntityGraph(attributePaths = "owner")
    @Query("SELECT m FROM Match m WHERE m.deletedAt IS NULL AND m.status = 'PUBLISHED' " +
            "AND (LOWER(m.title) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(m.playerAName) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(m.playerBName) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Match> searchPublicMatches(
            @Param("search") String search,
            Pageable pageable
    );

    long countByDeletedAtIsNull();

    long countByDeletedAtIsNotNull();

    long countByStatusAndDeletedAtIsNull(String status);

    /**
     * Matches left in ANALYZING with no analysis still queued or running (the worker failed, a job was
     * cancelled or lost): back to ANALYZED when an earlier analysis completed, otherwise READY to analyse again.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE matches m SET status = CASE WHEN EXISTS (SELECT 1 FROM ai_analyses a "
            + "WHERE a.match_id = m.id AND a.status = 'COMPLETED') THEN 'ANALYZED' ELSE 'READY' END, updated_at = NOW() "
            + "WHERE m.status = 'ANALYZING' AND NOT EXISTS (SELECT 1 FROM ai_analyses a "
            + "WHERE a.match_id = m.id AND a.status IN ('QUEUED', 'PROCESSING'))", nativeQuery = true)
    int releaseStuckAnalyzing();
}
