package com.servegood.service;

import com.servegood.config.AppProperties;
import com.servegood.dto.AuthDtos.AccountType;
import com.servegood.dto.AuthDtos.AuthResponse;
import com.servegood.dto.AuthDtos.ForgotPasswordRequest;
import com.servegood.dto.AuthDtos.LoginRequest;
import com.servegood.dto.AuthDtos.RegisterRequest;
import com.servegood.dto.AuthDtos.ResetPasswordRequest;
import com.servegood.entity.PasswordResetToken;
import com.servegood.entity.RefreshToken;
import com.servegood.entity.User;
import com.servegood.entity.enums.RoleName;
import com.servegood.exception.ApiException;
import com.servegood.mapper.DashboardMapper;
import com.servegood.repository.PasswordResetTokenRepository;
import com.servegood.repository.RefreshTokenRepository;
import com.servegood.repository.RoleRepository;
import com.servegood.repository.UserRepository;
import com.servegood.security.JwtService;
import com.servegood.service.mail.EmailSender;
import com.servegood.service.support.Tokens;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final Duration RESET_TTL = Duration.ofMinutes(30);
    private static final Duration REUSE_GRACE = Duration.ofSeconds(30);

    /** Issued tokens. The refresh token goes into an httpOnly cookie, never the JSON body. */
    public record Session(AuthResponse response, String refreshToken, Duration refreshTtl) {}

    private final UserRepository users;
    private final RoleRepository roles;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordResetTokenRepository resetTokens;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final EmailSender email;
    private final AuditLogService auditLog;
    private final AppProperties props;
    private final String dummyHash;

    public AuthService(UserRepository users, RoleRepository roles, RefreshTokenRepository refreshTokens,
                       PasswordResetTokenRepository resetTokens, PasswordEncoder encoder, JwtService jwt,
                       EmailSender email, AuditLogService auditLog, AppProperties props) {
        this.users = users;
        this.roles = roles;
        this.refreshTokens = refreshTokens;
        this.resetTokens = resetTokens;
        this.encoder = encoder;
        this.jwt = jwt;
        this.email = email;
        this.auditLog = auditLog;
        this.props = props;
        // Compared against when the email is unknown, so response time does not reveal which emails exist.
        this.dummyHash = encoder.encode(Tokens.newToken());
    }

    public static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    @Transactional
    public Session register(RegisterRequest request) {
        String emailAddress = normalizeEmail(request.email());
        if (users.existsByEmailIgnoreCase(emailAddress)) {
            throw ApiException.conflict("An account with this email already exists. Try signing in instead.");
        }
        RoleName roleName = request.accountType() == AccountType.RESTAURANT_OWNER ? RoleName.RESTAURANT_OWNER : RoleName.CONSUMER;
        User user = new User();
        user.setEmail(emailAddress);
        user.setFullName(request.fullName().trim());
        user.setPhone(blankToNull(request.phone()));
        user.setPasswordHash(encoder.encode(request.password()));
        user.getRoles().add(roles.findByName(roleName).orElseThrow());
        user.setLastLoginAt(Instant.now());
        users.save(user);
        auditLog.recordFor(user.getId(), user.getEmail(), "USER_REGISTERED", "USER", user.getId(), "role=" + roleName);
        return issue(user);
    }

    @Transactional
    public Session login(LoginRequest request) {
        User user = users.findByEmailIgnoreCase(normalizeEmail(request.email())).orElse(null);
        if (user == null || user.getDeletedAt() != null) {
            encoder.matches(request.password(), dummyHash);
            throw new BadCredentialsException("bad credentials");
        }
        if (!encoder.matches(request.password(), user.getPasswordHash())) {
            auditLog.recordFor(user.getId(), user.getEmail(), "LOGIN_FAILED", "USER", user.getId(), null);
            throw new BadCredentialsException("bad credentials");
        }
        if (!user.isActive()) {
            throw new DisabledException("suspended");
        }
        user.setLastLoginAt(Instant.now());
        auditLog.recordFor(user.getId(), user.getEmail(), "LOGIN", "USER", user.getId(), null);
        return issue(user);
    }

    /**
     * Rotates the refresh token. Presenting a token that was already revoked means
     * it was copied and used elsewhere, so every session for that user is ended.
     */
    @Transactional(noRollbackFor = ApiException.class)
    public Session refresh(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw ApiException.unauthorized("Session expired. Please sign in again.");
        }
        RefreshToken token = refreshTokens.findByTokenHash(Tokens.hash(rawToken))
                .orElseThrow(() -> ApiException.unauthorized("Session expired. Please sign in again."));
        Instant now = Instant.now();
        if (token.getRevokedAt() != null && token.getRevokedAt().isAfter(now.minus(REUSE_GRACE))) {
            // Two tabs refreshing at once: the other tab already rotated this token and the
            // browser now holds the new cookie. Not theft; the caller should simply retry.
            throw ApiException.conflict("Session was just refreshed. Retry.");
        }
        if (token.getRevokedAt() != null) {
            refreshTokens.revokeAllForUser(token.getUser().getId(), now);
            log.warn("Revoked refresh token reused for user {}; all sessions ended", token.getUser().getId());
            throw ApiException.unauthorized("Session expired. Please sign in again.");
        }
        if (!token.isUsable(now)) {
            throw ApiException.unauthorized("Session expired. Please sign in again.");
        }
        User user = token.getUser();
        if (!user.isActive()) {
            token.setRevokedAt(now);
            throw ApiException.forbidden("This account is suspended");
        }
        token.setRevokedAt(now);
        return issue(user);
    }

    @Transactional
    public void logout(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        refreshTokens.findByTokenHash(Tokens.hash(rawToken)).ifPresent(t -> {
            if (t.getRevokedAt() == null) {
                t.setRevokedAt(Instant.now());
            }
            auditLog.recordFor(t.getUser().getId(), t.getUser().getEmail(), "LOGOUT", "USER", t.getUser().getId(), null);
        });
    }

    /** Always succeeds from the caller's point of view, so it cannot be used to discover accounts. */
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        users.findByEmailIgnoreCase(normalizeEmail(request.email())).filter(User::isActive).ifPresent(user -> {
            String raw = Tokens.newToken();
            PasswordResetToken token = new PasswordResetToken();
            token.setUser(user);
            token.setTokenHash(Tokens.hash(raw));
            token.setExpiresAt(Instant.now().plus(RESET_TTL));
            resetTokens.save(token);
            String link = props.frontendUrl().replaceAll("/+$", "") + "/reset-password?token=" + raw;
            email.send(user.getEmail(), "Reset your ServeGood password",
                    "Hi " + user.getFullName() + ",\n\nUse this link within 30 minutes to choose a new password:\n" + link
                            + "\n\nIf you did not ask for this, you can ignore this email.");
            auditLog.recordFor(user.getId(), user.getEmail(), "PASSWORD_RESET_REQUESTED", "USER", user.getId(), null);
        });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken token = resetTokens.findByTokenHash(Tokens.hash(request.token()))
                .orElseThrow(() -> ApiException.badRequest("This reset link is invalid or has expired"));
        Instant now = Instant.now();
        if (token.getUsedAt() != null || token.getExpiresAt().isBefore(now)) {
            throw ApiException.badRequest("This reset link is invalid or has expired");
        }
        User user = token.getUser();
        user.setPasswordHash(encoder.encode(request.password()));
        token.setUsedAt(now);
        refreshTokens.revokeAllForUser(user.getId(), now);
        auditLog.recordFor(user.getId(), user.getEmail(), "PASSWORD_RESET", "USER", user.getId(), null);
    }

    private Session issue(User user) {
        String raw = Tokens.newToken();
        Duration refreshTtl = Duration.ofDays(props.jwt().refreshTokenDays());
        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setTokenHash(Tokens.hash(raw));
        token.setExpiresAt(Instant.now().plus(refreshTtl));
        refreshTokens.save(token);
        AuthResponse response = new AuthResponse(jwt.issueAccessToken(user), jwt.accessTtl().toSeconds(),
                DashboardMapper.toDto(user));
        return new Session(response, raw, refreshTtl);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
