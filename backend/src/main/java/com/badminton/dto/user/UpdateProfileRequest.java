package com.badminton.dto.user;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {

    @Size(max = 100, message = "Họ và tên tối đa 100 ký tự")
    private String fullName;

    @Min(value = 5, message = "Tuổi tối thiểu là 5")
    @Max(value = 100, message = "Tuổi tối đa là 100")
    private Integer age;

    private String gender; // MALE, FEMALE, OTHER

    private String badmintonLevel; // BEGINNER, INTERMEDIATE, ADVANCED, PRO
}

