package com.servegood.controller;

import com.servegood.config.AppProperties;
import com.servegood.dto.ApiResponse;
import com.servegood.dto.AuthDtos.AuthResponse;
import com.servegood.dto.AuthDtos.ForgotPasswordRequest;
import com.servegood.dto.AuthDtos.LoginRequest;
import com.servegood.dto.AuthDtos.RegisterRequest;
import com.servegood.dto.AuthDtos.ResetPasswordRequest;
import com.servegood.exception.ApiException;
import com.servegood.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Access tokens are returned in the body and kept in memory by the frontend.
 * Refresh tokens live only in an httpOnly, SameSite=Strict cookie scoped to /api/auth.
 */
@Tag(name = "Authentication")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    static final String REFRESH_COOKIE = "sg_refresh";

    private final AuthService auth;
    private final AppProperties props;

    public AuthController(AuthService auth, AppProperties props) {
        this.auth = auth;
        this.props = props;
    }

    @Operation(summary = "Create a consumer or restaurant-owner account")
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        return withSession(auth.register(request), HttpStatus.CREATED, "Account created");
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        return withSession(auth.login(request), HttpStatus.OK, null);
    }

    @Operation(summary = "Exchange the refresh cookie for a new access token (rotates the refresh token)")
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@CookieValue(name = REFRESH_COOKIE, required = false) String token) {
        try {
            return withSession(auth.refresh(token), HttpStatus.OK, null);
        } catch (ApiException e) {
            if (e.getStatus() == HttpStatus.CONFLICT) {
                // Another tab rotated the cookie a moment ago; keep the (new) cookie the browser holds.
                return ResponseEntity.status(e.getStatus()).body(ApiResponse.error(e.getMessage()));
            }
            // The browser should stop sending a dead cookie.
            return ResponseEntity.status(e.getStatus())
                    .header(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString())
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@CookieValue(name = REFRESH_COOKIE, required = false) String token) {
        auth.logout(token);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString())
                .body(ApiResponse.ok(null, "Signed out"));
    }

    @PostMapping("/forgot-password")
    public ApiResponse<Void> forgot(@Valid @RequestBody ForgotPasswordRequest request) {
        auth.forgotPassword(request);
        return ApiResponse.ok(null, "If an account exists for that email, a reset link is on its way.");
    }

    @PostMapping("/reset-password")
    public ApiResponse<Void> reset(@Valid @RequestBody ResetPasswordRequest request) {
        auth.resetPassword(request);
        return ApiResponse.ok(null, "Password updated. Please sign in with your new password.");
    }

    private ResponseEntity<ApiResponse<AuthResponse>> withSession(AuthService.Session session, HttpStatus status, String message) {
        return ResponseEntity.status(status)
                .header(HttpHeaders.SET_COOKIE, cookie(session.refreshToken(), session.refreshTtl()).toString())
                .body(ApiResponse.ok(session.response(), message));
    }

    private ResponseCookie cookie(String value, Duration maxAge) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)
                .secure(props.jwt().secureCookie())
                .sameSite("Strict")
                .path("/api/auth")
                .maxAge(maxAge)
                .build();
    }
}
