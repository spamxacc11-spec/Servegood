package com.servegood.service;

import com.servegood.dto.AuthDtos.ChangePasswordRequest;
import com.servegood.dto.AuthDtos.UpdateProfileRequest;
import com.servegood.dto.AuthDtos.UserDto;
import com.servegood.dto.DashboardDtos.CreateStaffRequest;
import com.servegood.dto.DashboardDtos.UserAdminUpdate;
import com.servegood.dto.PageResponse;
import com.servegood.entity.Role;
import com.servegood.entity.User;
import com.servegood.entity.enums.RoleName;
import com.servegood.entity.enums.UserStatus;
import com.servegood.exception.ApiException;
import com.servegood.mapper.DashboardMapper;
import com.servegood.repository.RefreshTokenRepository;
import com.servegood.repository.RoleRepository;
import com.servegood.repository.UserRepository;
import com.servegood.security.CurrentUser;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository users;
    private final RoleRepository roles;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder encoder;
    private final CurrentUser currentUser;
    private final AuditLogService auditLog;

    public UserService(UserRepository users, RoleRepository roles, RefreshTokenRepository refreshTokens,
                       PasswordEncoder encoder, CurrentUser currentUser, AuditLogService auditLog) {
        this.users = users;
        this.roles = roles;
        this.refreshTokens = refreshTokens;
        this.encoder = encoder;
        this.currentUser = currentUser;
        this.auditLog = auditLog;
    }

    @Transactional(readOnly = true)
    public UserDto me() {
        return DashboardMapper.toDto(currentUser.entity());
    }

    @Transactional
    public UserDto updateProfile(UpdateProfileRequest request) {
        User user = currentUser.entity();
        user.setFullName(request.fullName().trim());
        user.setPhone(request.phone() == null || request.phone().isBlank() ? null : request.phone().trim());
        user.setAvatarUrl(request.avatarUrl() == null || request.avatarUrl().isBlank() ? null : request.avatarUrl());
        user.setEmailNotifications(request.emailNotifications());
        auditLog.record("PROFILE_UPDATED", "USER", user.getId(), null);
        return DashboardMapper.toDto(user);
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        User user = currentUser.entity();
        if (!encoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw ApiException.badRequest("Your current password is not correct");
        }
        user.setPasswordHash(encoder.encode(request.newPassword()));
        // Other devices must sign in again with the new password.
        refreshTokens.revokeAllForUser(user.getId(), Instant.now());
        auditLog.record("PASSWORD_CHANGED", "USER", user.getId(), null);
    }

    /** Soft-deletes the caller's account. Reviews stay, attributed to a removed member. */
    @Transactional
    public void deleteMyAccount(String password) {
        User user = currentUser.entity();
        if (password == null || !encoder.matches(password, user.getPasswordHash())) {
            throw ApiException.badRequest("Your password is not correct");
        }
        if (user.hasRole(RoleName.ADMIN) && users.countByRole(RoleName.ADMIN) <= 1) {
            throw ApiException.badRequest("The last admin account cannot be deleted");
        }
        user.setDeletedAt(Instant.now());
        user.setEmail("deleted-" + user.getId() + "@deleted.invalid");
        user.setFullName("Removed member");
        user.setPhone(null);
        user.setAvatarUrl(null);
        refreshTokens.revokeAllForUser(user.getId(), Instant.now());
        auditLog.record("ACCOUNT_DELETED", "USER", user.getId(), null);
    }

    // ------------------------------------------------------------------ admin

    @Transactional(readOnly = true)
    public PageResponse<UserDto> search(String q, RoleName role, UserStatus status, int page, int size) {
        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            p.add(cb.isNull(root.get("deletedAt")));
            if (q != null && !q.isBlank()) {
                String like = "%" + q.trim().toLowerCase() + "%";
                p.add(cb.or(cb.like(cb.lower(root.get("email")), like), cb.like(cb.lower(root.get("fullName")), like)));
            }
            if (role != null) {
                Join<User, Role> r = root.join("roles", JoinType.INNER);
                p.add(cb.equal(r.get("name"), role));
                query.distinct(true);
            }
            if (status != null) {
                p.add(cb.equal(root.get("status"), status));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        return PageResponse.of(users.findAll(spec, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))),
                DashboardMapper::toDto);
    }

    @Transactional(readOnly = true)
    public List<UserDto> reviewers() {
        return users.findActiveByRole(RoleName.REVIEWER).stream().map(DashboardMapper::toDto).toList();
    }

    @Transactional
    public UserDto adminUpdate(Long userId, UserAdminUpdate request) {
        User user = users.findById(userId).filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> ApiException.notFound("User"));
        if (request.roles().isEmpty()) {
            throw ApiException.badRequest("A user needs at least one role");
        }
        boolean self = user.getId().equals(currentUser.id());
        boolean losingAdmin = user.hasRole(RoleName.ADMIN)
                && (!request.roles().contains(RoleName.ADMIN) || request.status() != UserStatus.ACTIVE);
        if (self && losingAdmin) {
            throw ApiException.badRequest("You cannot remove your own admin access or suspend yourself");
        }
        if (losingAdmin && users.countByRole(RoleName.ADMIN) <= 1) {
            throw ApiException.badRequest("There must always be at least one active admin");
        }
        Set<Role> newRoles = new HashSet<>();
        for (RoleName name : request.roles()) {
            newRoles.add(roles.findByName(name).orElseThrow());
        }
        String before = user.roleNames() + "/" + user.getStatus();
        user.setRoles(newRoles);
        user.setStatus(request.status());
        if (request.status() == UserStatus.SUSPENDED) {
            refreshTokens.revokeAllForUser(user.getId(), Instant.now());
        }
        auditLog.record("USER_UPDATED", "USER", user.getId(), before + " -> " + user.roleNames() + "/" + user.getStatus());
        return DashboardMapper.toDto(user);
    }

    /** Reviewers and admins are created by an admin, never through public sign-up. */
    @Transactional
    public UserDto createStaff(CreateStaffRequest request) {
        String email = AuthService.normalizeEmail(request.email());
        if (users.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("An account with this email already exists");
        }
        if (request.roles().isEmpty()) {
            throw ApiException.badRequest("Choose at least one role");
        }
        User user = new User();
        user.setEmail(email);
        user.setFullName(request.fullName().trim());
        user.setPasswordHash(encoder.encode(request.password()));
        for (RoleName name : request.roles()) {
            user.getRoles().add(roles.findByName(name).orElseThrow());
        }
        users.save(user);
        auditLog.record("USER_CREATED", "USER", user.getId(), "roles=" + user.roleNames());
        return DashboardMapper.toDto(user);
    }
}
