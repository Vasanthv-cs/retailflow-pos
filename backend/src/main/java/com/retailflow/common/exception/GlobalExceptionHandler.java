package com.retailflow.common.exception;

import com.retailflow.common.api.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.ArrayList;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException ex, HttpServletRequest request) {
        ErrorResponse response = new ErrorResponse(
                ex.getCode(),
                ex.getMessage(),
                ex.getStatus().value(),
                request.getRequestURI(),
                null
        );
        return new ResponseEntity<>(response, ex.getStatus());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<ErrorResponse.FieldErrorDetail> details = new ArrayList<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            String fieldLower = fe.getField().toLowerCase();
            Object safeRejected = (fieldLower.contains("password") || fieldLower.contains("secret") || fieldLower.contains("token"))
                    ? "******"
                    : fe.getRejectedValue();
            details.add(new ErrorResponse.FieldErrorDetail(
                    fe.getField(),
                    safeRejected,
                    fe.getDefaultMessage()
            ));
        }

        ErrorResponse response = new ErrorResponse(
                "VALIDATION_FAILED",
                "Request payload validation failed",
                HttpStatus.BAD_REQUEST.value(),
                request.getRequestURI(),
                details
        );
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException ex, HttpServletRequest request) {
        ErrorResponse response = new ErrorResponse(
                "INVALID_CREDENTIALS",
                "Invalid email or password",
                HttpStatus.UNAUTHORIZED.value(),
                request.getRequestURI(),
                null
        );
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        ErrorResponse response = new ErrorResponse(
                "ACCESS_DENIED",
                "User lacks required permissions for this action",
                HttpStatus.FORBIDDEN.value(),
                request.getRequestURI(),
                null
        );
        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneralException(Exception ex, HttpServletRequest request) {
        ErrorResponse response = new ErrorResponse(
                "INTERNAL_ERROR",
                "An unexpected server error occurred",
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                request.getRequestURI(),
                null
        );
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
