package com.badminton.common.exception;

import com.badminton.common.dto.ErrorDetail;
import com.badminton.common.dto.ErrorResponse;
import com.badminton.common.dto.ErrorType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApiException(ApiException ex) {
        ErrorResponse errorResponse = ErrorResponse.builder()
                .errorType(ex.getErrorType())
                .code(ex.getCode())
                .message(ex.getMessage())
                .timestamp(Instant.now())
                .build();
        return new ResponseEntity<>(errorResponse, ex.getStatus());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex) {
        List<ErrorDetail> details = new ArrayList<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            details.add(ErrorDetail.builder()
                    .field(fieldError.getField())
                    .issue(fieldError.getDefaultMessage())
                    .build());
        }

        ErrorResponse errorResponse = ErrorResponse.builder()
                .errorType(ErrorType.VALIDATION)
                .code("ERR_INVALID_PAYLOAD")
                .message("Dữ liệu gửi lên không đúng định dạng hoặc thiếu trường bắt buộc.")
                .details(details)
                .timestamp(Instant.now())
                .build();
        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(AuthenticationException ex) {
        ErrorResponse errorResponse = ErrorResponse.builder()
                .errorType(ErrorType.SYSTEM)
                .code("ERR_UNAUTHORIZED")
                .message("Phiên làm việc đã hết hạn hoặc không hợp lệ: " + ex.getMessage())
                .timestamp(Instant.now())
                .build();
        return new ResponseEntity<>(errorResponse, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(AccessDeniedException ex) {
        ErrorResponse errorResponse = ErrorResponse.builder()
                .errorType(ErrorType.SYSTEM)
                .code("ERR_FORBIDDEN_ACCESS")
                .message("Bạn không có quyền thực hiện hành động này trên tài nguyên.")
                .timestamp(Instant.now())
                .build();
        return new ResponseEntity<>(errorResponse, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSizeExceededException(MaxUploadSizeExceededException ex) {
        ErrorResponse errorResponse = ErrorResponse.builder()
                .errorType(ErrorType.UPLOAD)
                .code("ERR_FILE_TOO_LARGE")
                .message("Dung lượng file tải lên vượt quá giới hạn tối đa cho phép.")
                .timestamp(Instant.now())
                .build();
        return new ResponseEntity<>(errorResponse, HttpStatus.PAYLOAD_TOO_LARGE);
    }

    /** Unknown path: 404, not a system error. */
    @ExceptionHandler({NoResourceFoundException.class,
            NoHandlerFoundException.class})
    public ResponseEntity<ErrorResponse> handleNotFound(Exception ex) {
        return simple(HttpStatus.NOT_FOUND, ErrorType.VALIDATION, "ERR_NOT_FOUND",
                "Không tìm thấy đường dẫn yêu cầu.");
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupported(
            HttpRequestMethodNotSupportedException ex) {
        return simple(HttpStatus.METHOD_NOT_ALLOWED, ErrorType.VALIDATION, "ERR_METHOD_NOT_ALLOWED",
                "Phương thức " + ex.getMethod() + " không được hỗ trợ cho đường dẫn này.");
    }

    /** Malformed JSON, a path or query value of the wrong type, or a missing required parameter. */
    @ExceptionHandler({HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class})
    public ResponseEntity<ErrorResponse> handleBadRequest(Exception ex) {
        return simple(HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, "ERR_INVALID_PAYLOAD",
                "Dữ liệu gửi lên không đúng định dạng hoặc thiếu tham số bắt buộc.");
    }

    private static ResponseEntity<ErrorResponse> simple(HttpStatus status, ErrorType type, String code, String message) {
        return new ResponseEntity<>(ErrorResponse.builder()
                .errorType(type)
                .code(code)
                .message(message)
                .timestamp(Instant.now())
                .build(), status);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneralException(Exception ex) {
        ErrorResponse errorResponse = ErrorResponse.builder()
                .errorType(ErrorType.SYSTEM)
                .code("ERR_INTERNAL_SERVER")
                .message("Lỗi hệ thống nội bộ: " + ex.getMessage())
                .timestamp(Instant.now())
                .build();
        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}

