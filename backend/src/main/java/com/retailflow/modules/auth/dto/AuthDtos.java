package com.retailflow.modules.auth.dto;

import com.retailflow.modules.auth.entity.RoleName;
import com.retailflow.modules.auth.entity.User;
import com.retailflow.modules.auth.entity.UserStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;

public class AuthDtos {

    public static class LoginRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        @NotBlank(message = "Password is required")
        private String password;

        public LoginRequest() {}

        public LoginRequest(String email, String password) {
            this.email = email;
            this.password = password;
        }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class AuthResponse {
        private String token;
        private String tokenType = "Bearer";
        private String userId;
        private String name;
        private String email;
        private String role;
        private String employeeCode;
        private String storeId;

        public AuthResponse() {}

        public AuthResponse(String token, String userId, String name, String email, String role, String employeeCode, String storeId) {
            this.token = token;
            this.tokenType = "Bearer";
            this.userId = userId;
            this.name = name;
            this.email = email;
            this.role = role;
            this.employeeCode = employeeCode;
            this.storeId = storeId;
        }

        public String getToken() { return token; }
        public String getTokenType() { return tokenType; }
        public String getUserId() { return userId; }
        public String getName() { return name; }
        public String getEmail() { return email; }
        public String getRole() { return role; }
        public String getEmployeeCode() { return employeeCode; }
        public String getStoreId() { return storeId; }
    }

    public static class UserResponseDto {
        private String id;
        private String name;
        private String employeeCode;
        private String email;
        private String phone;
        private String role;
        private String shift;
        private String status;
        private LocalDate joinedDate;
        private Instant lastLoginAt;

        public UserResponseDto() {}

        public static UserResponseDto fromEntity(User user) {
            UserResponseDto dto = new UserResponseDto();
            dto.id = user.getId();
            dto.name = user.getName();
            dto.employeeCode = user.getEmployeeCode();
            dto.email = user.getEmail();
            dto.phone = user.getPhone();
            dto.role = user.getRole() != null ? user.getRole().getName().name() : "CASHIER";
            dto.shift = user.getShift();
            dto.status = user.getStatus() != null ? user.getStatus().name() : "ACTIVE";
            dto.joinedDate = user.getJoinedDate();
            dto.lastLoginAt = user.getLastLoginAt();
            return dto;
        }

        public String getId() { return id; }
        public String getName() { return name; }
        public String getEmployeeCode() { return employeeCode; }
        public String getEmail() { return email; }
        public String getPhone() { return phone; }
        public String getRole() { return role; }
        public String getShift() { return shift; }
        public String getStatus() { return status; }
        public LocalDate getJoinedDate() { return joinedDate; }
        public Instant getLastLoginAt() { return lastLoginAt; }
    }

    public static class UserDto extends UserResponseDto {}

    public static class CreateUserRequest {
        @NotBlank(message = "Full name is required")
        private String name;

        @NotBlank(message = "Employee code is required")
        private String employeeCode;

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        private String password;

        @NotBlank(message = "Phone number is required")
        private String phone;

        @NotNull(message = "Role is required")
        private RoleName role;

        private String shift = "Morning (7 AM - 3 PM)";

        public CreateUserRequest() {}

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getEmployeeCode() { return employeeCode; }
        public void setEmployeeCode(String employeeCode) { this.employeeCode = employeeCode; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
        public RoleName getRole() { return role; }
        public void setRole(RoleName role) { this.role = role; }
        public String getShift() { return shift; }
        public void setShift(String shift) { this.shift = shift; }
    }

    public static class UpdateUserRequest {
        @NotBlank(message = "Full name is required")
        private String name;

        @NotBlank(message = "Phone number is required")
        private String phone;

        @NotNull(message = "Role is required")
        private RoleName role;

        private String shift;

        public UpdateUserRequest() {}

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
        public RoleName getRole() { return role; }
        public void setRole(RoleName role) { this.role = role; }
        public String getShift() { return shift; }
        public void setShift(String shift) { this.shift = shift; }
    }

    public static class UpdateStatusRequest {
        @NotNull(message = "Status is required (ACTIVE, INACTIVE, SUSPENDED)")
        private UserStatus status;

        public UpdateStatusRequest() {}

        public UserStatus getStatus() { return status; }
        public void setStatus(UserStatus status) { this.status = status; }
    }

    public static class ChangePasswordRequest {
        @NotBlank(message = "Current password is required")
        private String currentPassword;

        @NotBlank(message = "New password is required")
        @Size(min = 6, message = "New password must be at least 6 characters")
        private String newPassword;

        public ChangePasswordRequest() {}

        public String getCurrentPassword() { return currentPassword; }
        public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }
        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
    }

    public static class ResetPasswordRequest {
        @NotBlank(message = "Temporary password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        private String temporaryPassword;

        public ResetPasswordRequest() {}

        public String getTemporaryPassword() { return temporaryPassword; }
        public void setTemporaryPassword(String temporaryPassword) { this.temporaryPassword = temporaryPassword; }
    }
}
