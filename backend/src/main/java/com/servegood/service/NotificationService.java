package com.servegood.service;

import com.servegood.dto.DashboardDtos.BroadcastRequest;
import com.servegood.dto.DashboardDtos.NotificationDto;
import com.servegood.dto.DashboardDtos.UnreadCountDto;
import com.servegood.dto.PageResponse;
import com.servegood.entity.Notification;
import com.servegood.entity.User;
import com.servegood.entity.enums.NotificationType;
import com.servegood.entity.enums.RoleName;
import com.servegood.exception.ApiException;
import com.servegood.mapper.DashboardMapper;
import com.servegood.repository.NotificationRepository;
import com.servegood.repository.RestaurantOwnerRepository;
import com.servegood.repository.UserRepository;
import com.servegood.security.CurrentUser;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private final NotificationRepository notifications;
    private final UserRepository users;
    private final RestaurantOwnerRepository owners;
    private final CurrentUser currentUser;
    private final AuditLogService auditLog;

    public NotificationService(NotificationRepository notifications, UserRepository users,
                               RestaurantOwnerRepository owners, CurrentUser currentUser, AuditLogService auditLog) {
        this.notifications = notifications;
        this.users = users;
        this.owners = owners;
        this.currentUser = currentUser;
        this.auditLog = auditLog;
    }

    @Transactional
    public void notify(User user, NotificationType type, String title, String body, String link) {
        Notification n = new Notification();
        n.setUser(user);
        n.setType(type);
        n.setTitle(truncate(title, 150));
        n.setBody(truncate(body, 1000));
        n.setLink(link);
        notifications.save(n);
    }

    @Transactional
    public void notifyRole(RoleName role, NotificationType type, String title, String body, String link) {
        users.findActiveByRole(role).forEach(u -> notify(u, type, title, body, link));
    }

    @Transactional
    public void notifyOwners(Long restaurantId, NotificationType type, String title, String body, String link) {
        owners.findByRestaurantIdWithUser(restaurantId).forEach(o -> notify(o.getUser(), type, title, body, link));
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationDto> mine(boolean unreadOnly, int page, int size) {
        Long userId = currentUser.id();
        var pageable = PageRequest.of(page, size);
        var result = unreadOnly
                ? notifications.findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(userId, pageable)
                : notifications.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        return PageResponse.of(result, DashboardMapper::toDto);
    }

    @Transactional(readOnly = true)
    public UnreadCountDto unreadCount() {
        return new UnreadCountDto(notifications.countByUserIdAndReadAtIsNull(currentUser.id()));
    }

    @Transactional
    public NotificationDto markRead(Long id) {
        Notification n = notifications.findById(id)
                .filter(x -> x.getUser().getId().equals(currentUser.id()))
                .orElseThrow(() -> ApiException.notFound("Notification"));
        if (n.getReadAt() == null) {
            n.setReadAt(Instant.now());
        }
        return DashboardMapper.toDto(n);
    }

    @Transactional
    public int markAllRead() {
        return notifications.markAllRead(currentUser.id(), Instant.now());
    }

    @Transactional
    public void delete(Long id) {
        Notification n = notifications.findById(id)
                .filter(x -> x.getUser().getId().equals(currentUser.id()))
                .orElseThrow(() -> ApiException.notFound("Notification"));
        notifications.delete(n);
    }

    /** Admin broadcast to one role, or to everyone when no role is given. */
    @Transactional
    public int broadcast(BroadcastRequest request) {
        List<User> recipients = request.role() == null
                ? users.findAll().stream().filter(User::isActive).toList()
                : users.findActiveByRole(request.role());
        recipients.forEach(u -> notify(u, NotificationType.SYSTEM, request.title(), request.body(), request.link()));
        auditLog.record("NOTIFICATION_BROADCAST", "NOTIFICATION", null,
                "role=" + (request.role() == null ? "ALL" : request.role()) + ", recipients=" + recipients.size()
                        + ", title=" + request.title());
        return recipients.size();
    }

    private static String truncate(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }
}
