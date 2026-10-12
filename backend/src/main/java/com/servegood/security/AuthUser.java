package com.servegood.security;

import com.servegood.entity.enums.RoleName;
import java.util.Collection;
import java.util.Set;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

/** The authenticated principal, built from a validated access token. */
public record AuthUser(Long id, String email, Set<RoleName> roles) {

    public boolean has(RoleName role) {
        return roles.contains(role);
    }

    public boolean isAdmin() {
        return has(RoleName.ADMIN);
    }

    public Collection<? extends GrantedAuthority> authorities() {
        return roles.stream().map(r -> new SimpleGrantedAuthority("ROLE_" + r.name())).toList();
    }
}
