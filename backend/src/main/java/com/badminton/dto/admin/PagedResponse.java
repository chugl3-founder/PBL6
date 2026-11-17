package com.badminton.dto.admin;

import com.badminton.common.dto.PaginationMeta;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

/** One page of an admin list: { data, pagination }, the same shape as the other admin lists. */
public record PagedResponse<T>(List<T> data, PaginationMeta pagination) {

    public static <E, T> PagedResponse<T> of(Page<E> page, Function<E, T> mapper) {
        return new PagedResponse<>(page.getContent().stream().map(mapper).toList(),
                PaginationMeta.builder()
                        .page(page.getNumber())
                        .size(page.getSize())
                        .totalElements(page.getTotalElements())
                        .totalPages(page.getTotalPages())
                        .build());
    }
}
