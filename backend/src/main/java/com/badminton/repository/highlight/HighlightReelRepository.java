package com.badminton.repository.highlight;

import com.badminton.entity.highlight.HighlightReel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    /** Every reel in the system, for the admin; match, owner and analysis come in the same query. */
    @EntityGraph(attributePaths = {"match", "owner", "analysis"})
    Page<HighlightReel> findAllBy(Pageable pageable);

    @EntityGraph(attributePaths = {"match", "owner", "analysis"})
    Page<HighlightReel> findByStatusIn(Collection<String> statuses, Pageable pageable);

    boolean existsByMatchIdAndStatusIn(Long matchId, Collection<String> statuses);
}
