package com.badminton.repository;

import com.badminton.entity.Video;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface VideoRepository extends JpaRepository<Video, Long> {

    Optional<Video> findByMatchId(Long matchId);

    /** The videos of a page of matches in one query. */
    List<Video> findByMatchIdIn(Collection<Long> matchIds);

    boolean existsByMatchId(Long matchId);
}

