package com.badminton.repository.scouting;

import com.badminton.entity.scouting.ScoutingReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ScoutingReportRepository extends JpaRepository<ScoutingReport, Long> {

    List<ScoutingReport> findByOwnerIdOrderByUpdatedAtDesc(Long ownerId);

    Optional<ScoutingReport> findByIdAndOwnerId(Long id, Long ownerId);

    Optional<ScoutingReport> findByShareToken(String shareToken);

    /** Reports anyone with the link can open, for the admin; the owner is fetched in the same query. */
    @EntityGraph(attributePaths = "owner")
    Page<ScoutingReport> findByShareTokenIsNotNull(Pageable pageable);

    long countByShareTokenIsNotNull();
}
