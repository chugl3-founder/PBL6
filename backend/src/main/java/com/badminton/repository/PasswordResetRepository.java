package com.badminton.repository;

import com.badminton.entity.PasswordReset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PasswordResetRepository extends JpaRepository<PasswordReset, Long> {

    Optional<PasswordReset> findByTokenHash(String tokenHash);

    @Modifying
    @Query("UPDATE PasswordReset p SET p.isUsed = true WHERE p.user.id = :userId")
    void invalidateAllByUserId(Long userId);
}

