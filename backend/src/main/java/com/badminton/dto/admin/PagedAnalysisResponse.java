package com.badminton.dto.admin;

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
public class PagedAnalysisResponse {
    private List<AdminAnalysisResponse> data;
    private PaginationMeta pagination;
}

