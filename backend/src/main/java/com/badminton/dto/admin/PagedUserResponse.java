package com.badminton.dto.admin;

import com.badminton.common.dto.PaginationMeta;
import com.badminton.dto.auth.UserResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagedUserResponse {
    private List<UserResponse> data;
    private PaginationMeta pagination;
}

