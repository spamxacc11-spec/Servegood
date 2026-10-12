package com.servegood.dto;

import com.servegood.entity.enums.RoleName;
import com.servegood.entity.enums.UserStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.Set;

public final class AuthDtos {

    private AuthDtos() {}

    /** Self-service sign-up is limited to diners and restaurant owners. */
    public enum AccountType { CONSUMER, RESTAURANT_OWNER }

    public record RegisterRequest(
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Size(min = 8, max = 100, message = "Password must be 8 to 100 characters") String password,
            @NotBlank @Size(max = 120) String fullName,
            @Size(max = 30) @Pattern(regexp = "^[0-9+()\\-\\s]*$", message = "Phone may only contain digits, spaces and + ( ) -") String phone,
            AccountType accountType) {}

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}

    public record ForgotPasswordRequest(@NotBlank @Email String email) {}

    public record ResetPasswordRequest(
            @NotBlank String token,
            @NotBlank @Size(min = 8, max = 100, message = "Password must be 8 to 100 characters") String password) {}

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 8, max = 100, message = "Password must be 8 to 100 characters") String newPassword) {}

    public record UpdateProfileRequest(
            @NotBlank @Size(max = 120) String fullName,
            @Size(max = 30) @Pattern(regexp = "^[0-9+()\\-\\s]*$", message = "Phone may only contain digits, spaces and + ( ) -") String phone,
            @Size(max = 500) String avatarUrl,
            @NotNull Boolean emailNotifications) {}

    public record UserDto(
            Long id,
            String email,
            String fullName,
            String phone,
            String avatarUrl,
            Set<RoleName> roles,
            UserStatus status,
            boolean emailNotifications,
            Instant createdAt,
            Instant lastLoginAt) {}

    /** The refresh token travels only in an httpOnly cookie and is never in this body. */
    public record AuthResponse(String accessToken, long expiresInSeconds, UserDto user) {}
}
