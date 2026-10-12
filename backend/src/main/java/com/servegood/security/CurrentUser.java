package com.servegood.security;

import com.servegood.entity.User;
import com.servegood.exception.ApiException;
import com.servegood.repository.UserRepository;
import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/** Access to the signed-in principal from services. */
@Component
public class CurrentUser {

    private final UserRepository users;

    public CurrentUser(UserRepository users) {
        this.users = users;
    }

    public Optional<AuthUser> optional() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthUser user) {
            return Optional.of(user);
        }
        return Optional.empty();
    }

    public AuthUser require() {
        return optional().orElseThrow(() -> ApiException.unauthorized("Please sign in"));
    }

    public Long id() {
        return require().id();
    }

    /** Loads the full user, rejecting accounts suspended or deleted since the token was issued. */
    public User entity() {
        User user = users.findById(id()).orElseThrow(() -> ApiException.unauthorized("Please sign in"));
        if (!user.isActive()) {
            throw ApiException.forbidden("This account is suspended");
        }
        return user;
    }
}
