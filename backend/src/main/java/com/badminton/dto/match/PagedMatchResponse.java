package com.badminton.dto.match;

import com.badminton.common.dto.PaginationMeta;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagedMatchResponse {
    private List<MatchResponse> data;
    private PaginationMeta pagination;
}

