package com.badminton.common.exception;

import com.badminton.common.dto.ErrorType;
import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * An error returned to the client as ErrorResponse. Codes follow openapi.yaml: ERR_ prefix; 403 is always
 * ERR_FORBIDDEN_ACCESS. Prefer the factories so status, type and code stay consistent.
 */
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

    /** 404 for a missing resource, e.g. ERR_MATCH_NOT_FOUND. */
    public static ApiException notFound(String code, String message) {
        return new ApiException(HttpStatus.NOT_FOUND, ErrorType.SYSTEM, code, message);
    }

    /** 403: the user is signed in but may not act on this resource. */
    public static ApiException forbidden(String message) {
        return new ApiException(HttpStatus.FORBIDDEN, ErrorType.SYSTEM, ErrorCodes.FORBIDDEN_ACCESS, message);
    }

    /** 400 for a request that breaks a business rule. */
    public static ApiException badRequest(String code, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, code, message);
    }

    /** 409 for a request that conflicts with the current state, e.g. a job already running. */
    public static ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, ErrorType.VALIDATION, code, message);
    }
}
