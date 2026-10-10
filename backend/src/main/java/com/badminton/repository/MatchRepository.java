package com.badminton.repository;

import com.badminton.entity.Match;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MatchRepository extends JpaRepository<Match, Long> {

    Optional<Match> findByIdAndDeletedAtIsNull(Long id);

    Page<Match> findByOwnerIdAndDeletedAtIsNull(Long ownerId, Pageable pageable);

    Page<Match> findByOwnerIdAndStatusAndDeletedAtIsNull(Long ownerId, String status, Pageable pageable);

    Page<Match> findByStatusAndDeletedAtIsNull(String status, Pageable pageable);

    Optional<Match> findByIdAndStatusAndDeletedAtIsNull(Long id, String status);

    @org.springframework.data.jpa.repository.Query("SELECT m FROM Match m WHERE m.deletedAt IS NULL AND m.status = 'PUBLISHED' " +
            "AND (LOWER(m.title) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(m.playerAName) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(m.playerBName) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Match> searchPublicMatches(
            @org.springframework.data.repository.query.Param("search") String search,
            Pageable pageable
    );
}

