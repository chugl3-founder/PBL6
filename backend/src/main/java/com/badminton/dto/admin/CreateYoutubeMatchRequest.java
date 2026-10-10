package com.badminton.dto.admin;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateYoutubeMatchRequest {

    @NotBlank(message = "Tên trận đấu không được để trống")
    private String title;

    private String description;

    @NotBlank(message = "Tên vận động viên A không được để trống")
    private String playerAName;

    @NotBlank(message = "Tên vận động viên B không được để trống")
    private String playerBName;

    @NotBlank(message = "Đường dẫn YouTube không được để trống")
    private String youtubeUrl;

    @Builder.Default
    private String upperPlayer = "PLAYER_A";

    @Builder.Default
    private String lowerPlayer = "PLAYER_B";

    private LocalDate matchDate;
}

