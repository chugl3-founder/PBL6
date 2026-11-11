package com.badminton.dto.video;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** A YouTube link to analyse instead of an uploaded file. */
public record YoutubeVideoRequest(
        @NotBlank(message = "Hãy dán link YouTube của trận đấu")
        @Size(max = 500, message = "Link YouTube quá dài")
        String url
) {
}
