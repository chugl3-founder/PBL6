package com.badminton.dto.scouting;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class ScoutingReportRequest {

    private ScoutingReportRequest() {
    }

    public record Create(
            @NotBlank(message = "Cần chọn đối thủ")
            @Size(max = 100, message = "Tên đối thủ không được vượt quá 100 ký tự")
            String opponentName,
            @Size(max = 100, message = "Tên vận động viên không được vượt quá 100 ký tự")
            String ownPlayerName,
            @Size(max = 200, message = "Tiêu đề không được vượt quá 200 ký tự")
            String title
    ) {
    }

    /** Null fields are left unchanged. */
    public record Update(
            @Size(min = 1, max = 200, message = "Tiêu đề phải từ 1 đến 200 ký tự")
            String title,
            @Size(max = 5000, message = "Ghi chú không được vượt quá 5000 ký tự")
            String coachNotes
    ) {
    }
}
