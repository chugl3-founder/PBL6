package com.badminton.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private Long id;
    private String email;
    private String role;
    private String fullName;
    private String avatarUrl;
    private Integer age;
    private String gender;
    private String badmintonLevel;
    private String status;
    private OffsetDateTime createdAt;
}

