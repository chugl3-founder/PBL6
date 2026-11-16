package com.badminton.service.video;

import com.badminton.common.exception.ApiException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class YoutubeSegmentTest {

    @Test
    void noTimesMeansTheWholeVideo() {
        VideoService.Segment segment = VideoService.youtubeSegment(null, null);
        assertThat(segment.start()).isNull();
        assertThat(segment.end()).isNull();
    }

    @Test
    void startOfZeroIsStoredAsTheWholeVideo() {
        assertThat(VideoService.youtubeSegment(0.0, null).start()).isNull();
    }

    @Test
    void keepsBothEndsOfARange() {
        VideoService.Segment segment = VideoService.youtubeSegment(1800.0, 2400.0);
        assertThat(segment.start()).isEqualByComparingTo(new BigDecimal("1800"));
        assertThat(segment.end()).isEqualByComparingTo(new BigDecimal("2400"));
    }

    @Test
    void endAloneAnalysesFromTheStart() {
        VideoService.Segment segment = VideoService.youtubeSegment(null, 1800.0);
        assertThat(segment.start()).isNull();
        assertThat(segment.end()).isEqualByComparingTo(new BigDecimal("1800"));
    }

    @Test
    void rejectsAnEndBeforeTheStart() {
        assertThatThrownBy(() -> VideoService.youtubeSegment(600.0, 300.0))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("ít nhất 30 giây");
    }

    @Test
    void rejectsARangeShorterThanThirtySeconds() {
        assertThatThrownBy(() -> VideoService.youtubeSegment(600.0, 620.0)).isInstanceOf(ApiException.class);
        assertThat(VideoService.youtubeSegment(600.0, 630.0).end()).isEqualByComparingTo(new BigDecimal("630"));
    }

    @Test
    void rejectsNegativeTimes() {
        assertThatThrownBy(() -> VideoService.youtubeSegment(-1.0, null)).isInstanceOf(ApiException.class);
    }
}
