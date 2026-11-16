package com.badminton.dto.video;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * A YouTube link to analyse instead of an uploaded file. startSeconds and endSeconds pick the part to
 * analyse, in seconds of the original video; leave them out to analyse the whole video.
 */
public record YoutubeVideoRequest(
        @NotBlank(message = "Hãy dán link YouTube của trận đấu")
        @Size(max = 500, message = "Link YouTube quá dài")
        String url,
        @PositiveOrZero(message = "Thời điểm bắt đầu không được âm")
        Double startSeconds,
        @PositiveOrZero(message = "Thời điểm kết thúc không được âm")
        Double endSeconds
) {
    public YoutubeVideoRequest(String url) {
        this(url, null, null);
    }
}
