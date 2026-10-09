package com.badminton.dto.match;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMatchRequest {

    @Size(max = 100, message = "Tên người chơi A không được vượt quá 100 ký tự")
    private String playerAName;

    @Size(max = 100, message = "Tên người chơi B không được vượt quá 100 ký tự")
    private String playerBName;

    @Pattern(regexp = "^(PLAYER_A|PLAYER_B)$", message = "Vị trí sân trên phải là PLAYER_A hoặc PLAYER_B")
    private String upperPlayer;

    @Pattern(regexp = "^(PLAYER_A|PLAYER_B)$", message = "Vị trí sân dưới phải là PLAYER_A hoặc PLAYER_B")
    private String lowerPlayer;

    private LocalDate matchDate;

    @Size(max = 200, message = "Tiêu đề trận đấu không được vượt quá 200 ký tự")
    private String title;

    private String description;
}

