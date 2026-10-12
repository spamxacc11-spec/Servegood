package com.servegood.service;

import com.servegood.entity.Restaurant;
import com.servegood.entity.enums.AssignmentStatus;
import com.servegood.exception.ApiException;
import com.servegood.repository.RestaurantOwnerRepository;
import com.servegood.repository.RestaurantRepository;
import com.servegood.repository.ReviewerAssignmentRepository;
import com.servegood.security.AuthUser;
import com.servegood.security.CurrentUser;
import java.util.EnumSet;
import org.springframework.stereotype.Component;

/**
 * Ownership and assignment checks that URL rules cannot express: an owner may
 * only manage restaurants linked to them, a reviewer may only audit restaurants
 * assigned to them. Admins pass every check.
 */
@Component
public class AccessGuard {

    private final RestaurantRepository restaurants;
    private final RestaurantOwnerRepository owners;
    private final ReviewerAssignmentRepository assignments;
    private final CurrentUser currentUser;

    public AccessGuard(RestaurantRepository restaurants, RestaurantOwnerRepository owners,
                       ReviewerAssignmentRepository assignments, CurrentUser currentUser) {
        this.restaurants = restaurants;
        this.owners = owners;
        this.assignments = assignments;
        this.currentUser = currentUser;
    }

    /** Returns the restaurant if the caller owns it (or is an admin); otherwise 404/403. */
    public Restaurant managedRestaurant(Long restaurantId) {
        Restaurant r = restaurants.findByIdAndDeletedAtIsNull(restaurantId)
                .orElseThrow(() -> ApiException.notFound("Restaurant"));
        AuthUser user = currentUser.require();
        if (!user.isAdmin() && !owners.existsByRestaurantIdAndUserId(restaurantId, user.id())) {
            throw ApiException.forbidden("You can only manage restaurants you own");
        }
        return r;
    }

    public boolean isOwner(Long restaurantId) {
        return currentUser.optional()
                .map(u -> owners.existsByRestaurantIdAndUserId(restaurantId, u.id()))
                .orElse(false);
    }

    public void requireAssignedReviewer(Long restaurantId) {
        AuthUser user = currentUser.require();
        if (user.isAdmin()) {
            return;
        }
        boolean assigned = assignments.existsByReviewerIdAndRestaurantIdAndStatusIn(user.id(), restaurantId,
                EnumSet.of(AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS, AssignmentStatus.COMPLETED));
        if (!assigned) {
            throw ApiException.forbidden("This restaurant is not assigned to you");
        }
    }
}
