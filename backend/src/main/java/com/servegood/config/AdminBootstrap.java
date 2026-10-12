package com.servegood.config;

import com.servegood.entity.User;
import com.servegood.entity.enums.RoleName;
import com.servegood.repository.RoleRepository;
import com.servegood.repository.UserRepository;
import com.servegood.service.AuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD when no admin exists.
 * Credentials come only from the environment; nothing is hard-coded.
 */
@Component
@Order(1)
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final AppProperties props;
    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder encoder;

    public AdminBootstrap(AppProperties props, UserRepository users, RoleRepository roles, PasswordEncoder encoder) {
        this.props = props;
        this.users = users;
        this.roles = roles;
        this.encoder = encoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.countByRole(RoleName.ADMIN) > 0) {
            return;
        }
        String email = props.bootstrap().adminEmail();
        String password = props.bootstrap().adminPassword();
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            log.warn("No admin account exists. Set ADMIN_EMAIL and ADMIN_PASSWORD and restart to create one.");
            return;
        }
        if (password.length() < 12) {
            log.error("ADMIN_PASSWORD must be at least 12 characters. Admin was not created.");
            return;
        }
        User admin = users.findByEmailIgnoreCase(AuthService.normalizeEmail(email)).orElseGet(User::new);
        admin.setEmail(AuthService.normalizeEmail(email));
        if (admin.getFullName() == null) {
            admin.setFullName("ServeGood Admin");
        }
        admin.setPasswordHash(encoder.encode(password));
        admin.getRoles().add(roles.findByName(RoleName.ADMIN).orElseThrow());
        users.save(admin);
        log.info("Created admin account {}", admin.getEmail());
    }
}
