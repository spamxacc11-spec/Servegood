package com.servegood.service.delivery;

import com.servegood.entity.RestaurantDeliveryOption;
import com.servegood.entity.enums.IntegrationType;
import com.servegood.entity.enums.PriceSource;
import com.servegood.repository.RestaurantDeliveryOptionRepository;
import com.servegood.repository.RestaurantRepository;
import com.servegood.service.AccessGuard;
import com.servegood.service.AuditLogService;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Pulls prices from connected provider APIs. With no {@link DeliveryQuoteClient}
 * beans registered (the current state), it reports that nothing is connected
 * instead of inventing figures.
 */
@Service
public class DeliveryRefreshService {

    public record RefreshResult(int connectedProviders, int pricesUpdated, String message) {}

    private final Map<String, DeliveryQuoteClient> clients;
    private final RestaurantDeliveryOptionRepository options;
    private final RestaurantRepository restaurants;
    private final DeliveryService deliveryService;
    private final AccessGuard guard;
    private final AuditLogService auditLog;

    public DeliveryRefreshService(List<DeliveryQuoteClient> clients, RestaurantDeliveryOptionRepository options,
                                  RestaurantRepository restaurants, DeliveryService deliveryService, AccessGuard guard,
                                  AuditLogService auditLog) {
        this.clients = clients.stream().collect(Collectors.toMap(DeliveryQuoteClient::providerSlug, Function.identity()));
        this.options = options;
        this.restaurants = restaurants;
        this.deliveryService = deliveryService;
        this.guard = guard;
        this.auditLog = auditLog;
    }

    @Transactional
    public RefreshResult refresh(Long restaurantId) {
        var restaurant = guard.managedRestaurant(restaurantId);
        if (clients.isEmpty()) {
            return new RefreshResult(0, 0,
                    "No delivery provider API is connected yet. Prices must be entered manually.");
        }
        String basket = restaurant.getComparisonBasket();
        if (basket == null || basket.isBlank()) {
            return new RefreshResult(clients.size(), 0, "Set a comparison basket on the restaurant first.");
        }
        int updated = 0;
        for (RestaurantDeliveryOption o : options.findByRestaurantIdWithProvider(restaurantId)) {
            if (o.getProvider().getIntegrationType() != IntegrationType.API || o.getOrderingUrl() == null) {
                continue;
            }
            DeliveryQuoteClient client = clients.get(o.getProvider().getSlug());
            if (client == null) {
                continue;
            }
            var quote = client.fetchQuote(o.getOrderingUrl(), basket);
            if (quote.isPresent()) {
                var q = quote.get();
                deliveryService.save(o, basket, q.foodSubtotal(), q.deliveryFee(), q.platformFee(), q.otherFees(),
                        q.discount(), PriceSource.PROVIDER_API);
                updated++;
            }
        }
        auditLog.record("DELIVERY_PRICES_REFRESHED", "RESTAURANT", restaurantId, "updated=" + updated);
        restaurants.flush();
        return new RefreshResult(clients.size(), updated, updated + " price(s) fetched from connected providers.");
    }
}
