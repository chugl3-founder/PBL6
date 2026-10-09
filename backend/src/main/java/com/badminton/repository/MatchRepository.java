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
}

