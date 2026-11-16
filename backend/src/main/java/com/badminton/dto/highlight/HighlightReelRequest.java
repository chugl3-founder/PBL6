package com.badminton.dto.highlight;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public final class HighlightReelRequest {

    private HighlightReelRequest() {
    }

    /** Clip times are taken from the stored rallies, never from the client. */
    public record Create(
            @Size(max = 200, message = "Tiêu đề không được vượt quá 200 ký tự")
            String title,
            @NotEmpty(message = "Cần chọn ít nhất một pha cầu")
            List<Long> rallyIds
    ) {
    }
}
