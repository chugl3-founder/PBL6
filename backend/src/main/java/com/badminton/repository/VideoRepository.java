package com.badminton.repository;

import com.badminton.entity.Video;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VideoRepository extends JpaRepository<Video, Long> {

    Optional<Video> findByMatchId(Long matchId);

    boolean existsByMatchId(Long matchId);
}

