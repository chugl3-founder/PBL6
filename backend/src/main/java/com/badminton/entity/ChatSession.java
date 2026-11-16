package com.badminton.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A conversation with the AI Coach. It belongs to a signed-in user (userId) or, for a guest, to one browser
 * (browserKey, a random id the browser keeps). matchId is the match being watched when it started.
 */
@Entity
@Table(name = "chat_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatSession {

    @Id
    private UUID id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "match_id")
    private Long matchId;

    @Column(length = 255)
    private String title;

    @Column(name = "browser_key", length = 100)
    private String browserKey;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
