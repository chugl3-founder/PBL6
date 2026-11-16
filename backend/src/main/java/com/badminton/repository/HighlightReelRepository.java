package com.badminton.repository;

import com.badminton.entity.HighlightReel;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface HighlightReelRepository extends JpaRepository<HighlightReel, Long> {

    List<HighlightReel> findByMatchIdOrderByCreatedAtDesc(Long matchId);

    /** Every reel of the owner on matches that still exist; the match is fetched in the same query. */
    @EntityGraph(attributePaths = "match")
    List<HighlightReel> findByOwnerEmailAndMatchDeletedAtIsNullOrderByCreatedAtDesc(String email);

    Optional<HighlightReel> findByIdAndMatchId(Long id, Long matchId);

    boolean existsByMatchIdAndStatusIn(Long matchId, Collection<String> statuses);
}
