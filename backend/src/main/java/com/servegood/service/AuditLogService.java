package com.servegood.service;

import com.servegood.dto.DashboardDtos.AuditLogDto;
import com.servegood.dto.PageResponse;
import com.servegood.entity.AuditLog;
import com.servegood.repository.AuditLogRepository;
import com.servegood.repository.UserRepository;
import com.servegood.security.CurrentUser;
import jakarta.persistence.criteria.Predicate;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/** Records significant actions. Runs inside the caller's transaction, so a rolled-back action leaves no log. */
@Service
public class AuditLogService {

    private final AuditLogRepository logs;
    private final UserRepository users;
    private final CurrentUser currentUser;

    public AuditLogService(AuditLogRepository logs, UserRepository users, CurrentUser currentUser) {
        this.logs = logs;
        this.users = users;
        this.currentUser = currentUser;
    }

    @Transactional
    public void record(String action, String entityType, Long entityId, String details) {
        AuditLog log = new AuditLog();
        log.setAction(action);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setDetails(details);
        currentUser.optional().ifPresent(u -> {
            log.setActor(users.getReferenceById(u.id()));
            log.setActorEmail(u.email());
        });
        log.setIpAddress(clientIp());
        logs.save(log);
    }

    /** For actions taken before a principal exists, such as sign-up and sign-in. */
    @Transactional
    public void recordFor(Long actorId, String actorEmail, String action, String entityType, Long entityId, String details) {
        AuditLog log = new AuditLog();
        log.setAction(action);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setDetails(details);
        if (actorId != null) {
            log.setActor(users.getReferenceById(actorId));
        }
        log.setActorEmail(actorEmail);
        log.setIpAddress(clientIp());
        logs.save(log);
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLogDto> search(String action, String entityType, Long entityId, String actor,
                                            Instant from, Instant to, int page, int size) {
        Specification<AuditLog> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (action != null && !action.isBlank()) {
                p.add(cb.like(cb.lower(root.get("action")), "%" + action.toLowerCase() + "%"));
            }
            if (entityType != null && !entityType.isBlank()) {
                p.add(cb.equal(root.get("entityType"), entityType));
            }
            if (entityId != null) {
                p.add(cb.equal(root.get("entityId"), entityId));
            }
            if (actor != null && !actor.isBlank()) {
                p.add(cb.like(cb.lower(root.get("actorEmail")), "%" + actor.toLowerCase() + "%"));
            }
            if (from != null) {
                p.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            }
            if (to != null) {
                p.add(cb.lessThan(root.get("createdAt"), to));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        var result = logs.findAll(spec, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")));
        return PageResponse.of(result, l -> new AuditLogDto(
                l.getId(), l.getActor() == null ? null : l.getActor().getId(), l.getActorEmail(), l.getAction(),
                l.getEntityType(), l.getEntityId(), l.getDetails(), l.getIpAddress(), l.getCreatedAt()));
    }

    private static String clientIp() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            HttpServletRequest request = attrs.getRequest();
            String forwarded = request.getHeader("X-Forwarded-For");
            String ip = forwarded != null && !forwarded.isBlank() ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
            return ip == null ? null : ip.substring(0, Math.min(ip.length(), 64));
        }
        return null;
    }
}
