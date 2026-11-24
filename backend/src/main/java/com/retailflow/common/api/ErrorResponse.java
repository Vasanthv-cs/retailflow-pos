package com.retailflow.common.api;

import java.time.Instant;
import java.util.List;

public class ErrorResponse {

    private boolean success;
    private Instant timestamp;
    private ErrorDetails error;

    public ErrorResponse() {
        this.success = false;
        this.timestamp = Instant.now();
    }

    public ErrorResponse(String code, String message, int status, String path, List<FieldErrorDetail> details) {
        this.success = false;
        this.timestamp = Instant.now();
        this.error = new ErrorDetails(code, message, status, path, details);
    }

    public boolean isSuccess() {
        return success;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public ErrorDetails getError() {
        return error;
    }

    public void setError(ErrorDetails error) {
        this.error = error;
    }

    public static class ErrorDetails {
        private String code;
        private String message;
        private int status;
        private String path;
        private List<FieldErrorDetail> details;

        public ErrorDetails() {}

        public ErrorDetails(String code, String message, int status, String path, List<FieldErrorDetail> details) {
            this.code = code;
            this.message = message;
            this.status = status;
            this.path = path;
            this.details = details;
        }

        public String getCode() {
            return code;
        }

        public String getMessage() {
            return message;
        }

        public int getStatus() {
            return status;
        }

        public String getPath() {
            return path;
        }

        public List<FieldErrorDetail> getDetails() {
            return details;
        }
    }

    public static class FieldErrorDetail {
        private String field;
        private Object rejectedValue;
        private String constraint;

        public FieldErrorDetail() {}

        public FieldErrorDetail(String field, Object rejectedValue, String constraint) {
            this.field = field;
            this.rejectedValue = rejectedValue;
            this.constraint = constraint;
        }

        public String getField() {
            return field;
        }

        public Object getRejectedValue() {
            return rejectedValue;
        }

        public String getConstraint() {
            return constraint;
        }
    }
}
