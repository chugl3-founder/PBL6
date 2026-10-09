package com.badminton.dto.video;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VideoUploadUrlRequest {

    @NotBlank(message = "Tên file video không được để trống")
    private String fileName;

    @NotNull(message = "Dung lượng file không được để trống")
    @Min(value = 1, message = "Dung lượng file phải lớn hơn 0")
    private Long fileSize;

    @Builder.Default
    private String mimeType = "video/mp4";
}

