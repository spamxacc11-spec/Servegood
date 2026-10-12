package com.servegood.mapper;

import com.servegood.dto.AuthDtos.UserDto;
import com.servegood.dto.DashboardDtos.NotificationDto;
import com.servegood.entity.Notification;
import com.servegood.entity.User;

public final class DashboardMapper {

    private DashboardMapper() {}

    public static NotificationDto toDto(Notification n) {
        return new NotificationDto(n.getId(), n.getType(), n.getTitle(), n.getBody(), n.getLink(), n.getReadAt() != null,
                n.getCreatedAt());
    }

    /** Never includes the password hash. */
    public static UserDto toDto(User u) {
        return new UserDto(u.getId(), u.getEmail(), u.getFullName(), u.getPhone(), u.getAvatarUrl(), u.roleNames(),
                u.getStatus(), u.isEmailNotifications(), u.getCreatedAt(), u.getLastLoginAt());
    }

    /** "Priya Shah" becomes "Priya S." so public review bylines do not expose full names. */
    public static String publicName(User u) {
        if (u == null || u.getFullName() == null || u.getFullName().isBlank()) {
            return "ServeGood member";
        }
        String[] parts = u.getFullName().trim().split("\\s+");
        return parts.length == 1 ? parts[0] : parts[0] + " " + parts[parts.length - 1].charAt(0) + ".";
    }
}
