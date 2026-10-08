package com.badminton.common.exception;

import com.badminton.common.dto.ErrorType;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final ErrorType errorType;
    private final String code;

    public ApiException(HttpStatus status, ErrorType errorType, String code, String message) {
        super(message);
        this.status = status;
        this.errorType = errorType;
        this.code = code;
    }
}

