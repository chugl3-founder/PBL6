package com.badminton.dto.analysis;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Where the viewer is watching, so the GPU worker analyses that part of the video first. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AnalysisFocusRequest {
    @NotNull
    @PositiveOrZero
    private Double seconds;
}
