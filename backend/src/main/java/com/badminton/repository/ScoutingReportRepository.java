package com.badminton.repository;

import com.badminton.entity.ScoutingReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ScoutingReportRepository extends JpaRepository<ScoutingReport, Long> {

    List<ScoutingReport> findByOwnerIdOrderByUpdatedAtDesc(Long ownerId);

    Optional<ScoutingReport> findByIdAndOwnerId(Long id, Long ownerId);

    Optional<ScoutingReport> findByShareToken(String shareToken);
}
