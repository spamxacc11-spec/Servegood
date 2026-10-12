package com.servegood.service.delivery;

import com.servegood.dto.DeliveryDtos.DeliveryComparisonDto;
import com.servegood.dto.DeliveryDtos.DeliveryOptionDto;
import com.servegood.dto.DeliveryDtos.OptionRequest;
import com.servegood.dto.DeliveryDtos.PriceDto;
import com.servegood.dto.DeliveryDtos.PriceRequest;
import com.servegood.dto.DeliveryDtos.ProviderDto;
import com.servegood.dto.DeliveryDtos.ProviderRequest;
import com.servegood.dto.PageResponse;
import com.servegood.entity.DeliveryPrice;
import com.servegood.entity.DeliveryProvider;
import com.servegood.entity.Restaurant;
import com.servegood.entity.RestaurantDeliveryOption;
import com.servegood.entity.enums.IntegrationType;
import com.servegood.entity.enums.PriceSource;
import com.servegood.exception.ApiException;
import com.servegood.mapper.DeliveryMapper;
import com.servegood.mapper.RestaurantMapper.DeliveryHighlight;
import com.servegood.repository.DeliveryPriceRepository;
import com.servegood.repository.DeliveryProviderRepository;
import com.servegood.repository.RestaurantDeliveryOptionRepository;
import com.servegood.repository.RestaurantRepository;
import com.servegood.repository.UserRepository;
import com.servegood.security.CurrentUser;
import com.servegood.service.AccessGuard;
import com.servegood.service.AuditLogService;
import com.servegood.service.support.Slugs;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Delivery options and price comparison.
 *
 * finalTotal = foodSubtotal + deliveryFee + platformFee + otherFees - discount,
 * computed here and nowhere else. Prices are entered by people (admins, or the
 * restaurant itself, labelled as such) unless a provider API is connected.
 */
@Service
public class DeliveryService {

    public static final String DISCLAIMER = "Prices are entered manually by ServeGood staff or the restaurant and are "
            + "not live. Each total shows when it was last updated. Check the final price on the platform before ordering.";

    private final DeliveryProviderRepository providers;
    private final RestaurantDeliveryOptionRepository options;
    private final DeliveryPriceRepository prices;
    private final RestaurantRepository restaurants;
    private final UserRepository users;
    private final AccessGuard guard;
    private final CurrentUser currentUser;
    private final AuditLogService auditLog;

    public DeliveryService(DeliveryProviderRepository providers, RestaurantDeliveryOptionRepository options,
                           DeliveryPriceRepository prices, RestaurantRepository restaurants, UserRepository users,
                           AccessGuard guard, CurrentUser currentUser, AuditLogService auditLog) {
        this.providers = providers;
        this.options = options;
        this.prices = prices;
        this.restaurants = restaurants;
        this.users = users;
        this.guard = guard;
        this.currentUser = currentUser;
        this.auditLog = auditLog;
    }

    public static BigDecimal finalTotal(BigDecimal food, BigDecimal delivery, BigDecimal platform, BigDecimal other,
                                        BigDecimal discount) {
        return nz(food).add(nz(delivery)).add(nz(platform)).add(nz(other)).subtract(nz(discount));
    }

    // ------------------------------------------------------------------ providers

    @Transactional(readOnly = true)
    public List<ProviderDto> providers(boolean includeInactive) {
        return providers.findAllByOrderBySortOrderAscNameAsc().stream()
                .filter(p -> includeInactive || p.isActive())
                .map(DeliveryMapper::toDto)
                .toList();
    }

    @Transactional
    public ProviderDto createProvider(ProviderRequest request) {
        DeliveryProvider p = new DeliveryProvider();
        String slug = request.slug() == null || request.slug().isBlank() ? Slugs.slugify(request.name()) : request.slug();
        if (providers.existsBySlug(slug)) {
            throw ApiException.conflict("A provider with slug '" + slug + "' already exists");
        }
        p.setSlug(slug);
        applyProvider(p, request);
        providers.save(p);
        auditLog.record("PROVIDER_CREATED", "DELIVERY_PROVIDER", p.getId(), p.getName());
        return DeliveryMapper.toDto(p);
    }

    @Transactional
    public ProviderDto updateProvider(Long id, ProviderRequest request) {
        DeliveryProvider p = providers.findById(id).orElseThrow(() -> ApiException.notFound("Delivery provider"));
        if (request.slug() != null && !request.slug().isBlank() && !request.slug().equals(p.getSlug())) {
            if (providers.existsBySlug(request.slug())) {
                throw ApiException.conflict("A provider with slug '" + request.slug() + "' already exists");
            }
            p.setSlug(request.slug());
        }
        applyProvider(p, request);
        auditLog.record("PROVIDER_UPDATED", "DELIVERY_PROVIDER", p.getId(), p.getName() + " active=" + p.isActive());
        return DeliveryMapper.toDto(p);
    }

    private static void applyProvider(DeliveryProvider p, ProviderRequest r) {
        p.setName(r.name().trim());
        p.setWebsiteUrl(blank(r.websiteUrl()));
        p.setLogoUrl(blank(r.logoUrl()));
        p.setIntegrationType(r.integrationType() == null ? IntegrationType.MANUAL : r.integrationType());
        p.setDirectChannel(Boolean.TRUE.equals(r.directChannel()));
        p.setActive(r.active() == null || r.active());
        p.setSortOrder(r.sortOrder() == null ? 0 : r.sortOrder());
    }

    // ------------------------------------------------------------------ public comparison

    /** GET /api/restaurants/{id}/delivery-options. */
    @Transactional(readOnly = true)
    public DeliveryComparisonDto comparison(Long restaurantId) {
        Restaurant r = restaurants.findByIdAndDeletedAtIsNull(restaurantId)
                .filter(Restaurant::isPublic)
                .orElseThrow(() -> ApiException.notFound("Restaurant"));
        List<RestaurantDeliveryOption> list = options.findByRestaurantIdWithProvider(restaurantId).stream()
                .filter(o -> o.isAvailable() && o.getProvider().isActive())
                .toList();
        return buildComparison(r, list);
    }

    private DeliveryComparisonDto buildComparison(Restaurant r, List<RestaurantDeliveryOption> list) {
        Map<Long, DeliveryPrice> latest = latestPrices(list);
        RestaurantDeliveryOption cheapest = list.stream()
                .filter(o -> o.isAvailable() && latest.containsKey(o.getId()))
                .min(Comparator.comparing((RestaurantDeliveryOption o) -> latest.get(o.getId()).getFinalTotal())
                        .thenComparing(o -> o.getProvider().getSortOrder()))
                .orElse(null);
        BigDecimal highest = list.stream()
                .filter(o -> o.isAvailable() && latest.containsKey(o.getId()))
                .map(o -> latest.get(o.getId()).getFinalTotal())
                .max(Comparator.naturalOrder())
                .orElse(null);
        List<DeliveryOptionDto> dtos = list.stream()
                .map(o -> DeliveryMapper.toDto(o, latest.get(o.getId()), cheapest != null && o.getId().equals(cheapest.getId())))
                .toList();
        DeliveryOptionDto cheapestDto = dtos.stream().filter(DeliveryOptionDto::cheapest).findFirst().orElse(null);
        BigDecimal saving = cheapest == null || highest == null ? null
                : highest.subtract(latest.get(cheapest.getId()).getFinalTotal());
        Instant lastUpdated = latest.values().stream().map(DeliveryPrice::getRecordedAt).max(Comparator.naturalOrder()).orElse(null);
        boolean live = latest.values().stream().anyMatch(p -> p.getSource() == PriceSource.PROVIDER_API);
        String basket = r.getComparisonBasket() != null ? r.getComparisonBasket()
                : latest.values().stream().map(DeliveryPrice::getBasketDescription).findFirst().orElse(null);
        return new DeliveryComparisonDto(r.getId(), r.getName(), basket, dtos, cheapestDto, saving, lastUpdated, live,
                live ? "Some prices come from a connected provider; others were entered manually. Check before ordering."
                        : DISCLAIMER);
    }

    /** Cheapest available quote per restaurant, for listing cards. One query for the whole page. */
    @Transactional(readOnly = true)
    public Map<Long, DeliveryHighlight> highlights(Collection<Long> restaurantIds) {
        Map<Long, DeliveryHighlight> out = new HashMap<>();
        if (restaurantIds.isEmpty()) {
            return out;
        }
        List<RestaurantDeliveryOption> list = options.findAvailableForRestaurants(restaurantIds);
        Map<Long, DeliveryPrice> latest = latestPrices(list);
        Map<Long, List<RestaurantDeliveryOption>> byRestaurant =
                list.stream().collect(Collectors.groupingBy(o -> o.getRestaurant().getId()));
        byRestaurant.forEach((rid, opts) -> {
            RestaurantDeliveryOption best = opts.stream()
                    .filter(o -> latest.containsKey(o.getId()))
                    .min(Comparator.comparing(o -> latest.get(o.getId()).getFinalTotal()))
                    .orElse(null);
            out.put(rid, new DeliveryHighlight(true,
                    best == null ? null : latest.get(best.getId()).getFinalTotal(),
                    best == null ? null : best.getProvider().getName()));
        });
        return out;
    }

    private Map<Long, DeliveryPrice> latestPrices(List<RestaurantDeliveryOption> list) {
        if (list.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = list.stream().map(RestaurantDeliveryOption::getId).toList();
        // If two rows share the newest timestamp, keep the higher id.
        return prices.findLatestForOptions(ids).stream()
                .collect(Collectors.toMap(p -> p.getOption().getId(), Function.identity(),
                        (a, b) -> a.getId() > b.getId() ? a : b));
    }

    // ------------------------------------------------------------------ management (owner or admin)

    @Transactional(readOnly = true)
    public DeliveryComparisonDto manageView(Long restaurantId) {
        Restaurant r = guard.managedRestaurant(restaurantId);
        return buildComparison(r, options.findByRestaurantIdWithProvider(restaurantId));
    }

    @Transactional
    public DeliveryOptionDto upsertOption(Long restaurantId, OptionRequest request) {
        Restaurant r = guard.managedRestaurant(restaurantId);
        DeliveryProvider provider = providers.findById(request.providerId())
                .filter(DeliveryProvider::isActive)
                .orElseThrow(() -> ApiException.notFound("Delivery provider"));
        RestaurantDeliveryOption o = options.findByRestaurantIdAndProviderId(restaurantId, provider.getId())
                .orElseGet(() -> {
                    RestaurantDeliveryOption created = new RestaurantDeliveryOption();
                    created.setRestaurant(r);
                    created.setProvider(provider);
                    return created;
                });
        o.setOrderingUrl(blank(request.orderingUrl()));
        o.setAvailable(request.available() == null || request.available());
        o.setNotes(blank(request.notes()));
        options.save(o);
        auditLog.record("DELIVERY_OPTION_SAVED", "RESTAURANT", restaurantId,
                provider.getName() + " available=" + o.isAvailable());
        DeliveryPrice latest = latestPrices(List.of(o)).get(o.getId());
        return DeliveryMapper.toDto(o, latest, false);
    }

    @Transactional
    public void deleteOption(Long optionId) {
        RestaurantDeliveryOption o = options.findById(optionId).orElseThrow(() -> ApiException.notFound("Delivery option"));
        guard.managedRestaurant(o.getRestaurant().getId());
        options.delete(o);
        auditLog.record("DELIVERY_OPTION_DELETED", "RESTAURANT", o.getRestaurant().getId(), o.getProvider().getName());
    }

    /** Records a new price. Owners' entries are labelled RESTAURANT_SUBMITTED; admins' are ADMIN_MANUAL. */
    @Transactional
    public PriceDto recordPrice(Long optionId, PriceRequest request) {
        RestaurantDeliveryOption o = options.findById(optionId).orElseThrow(() -> ApiException.notFound("Delivery option"));
        guard.managedRestaurant(o.getRestaurant().getId());
        PriceSource source = currentUser.require().isAdmin() ? PriceSource.ADMIN_MANUAL : PriceSource.RESTAURANT_SUBMITTED;
        DeliveryPrice p = save(o, request.basketDescription(), request.foodSubtotal(), request.deliveryFee(),
                request.platformFee(), request.otherFees(), request.discount(), source);
        p.setRecordedBy(users.getReferenceById(currentUser.id()));
        auditLog.record("DELIVERY_PRICE_RECORDED", "RESTAURANT", o.getRestaurant().getId(),
                o.getProvider().getName() + " total=" + p.getFinalTotal() + " source=" + source);
        return DeliveryMapper.toDto(p);
    }

    DeliveryPrice save(RestaurantDeliveryOption o, String basket, BigDecimal food, BigDecimal delivery,
                       BigDecimal platform, BigDecimal other, BigDecimal discount, PriceSource source) {
        BigDecimal total = finalTotal(food, delivery, platform, other, discount);
        if (total.signum() < 0) {
            throw ApiException.badRequest("Discount cannot be larger than the subtotal plus fees");
        }
        DeliveryPrice p = new DeliveryPrice();
        p.setOption(o);
        p.setBasketDescription(basket.trim());
        p.setFoodSubtotal(nz(food));
        p.setDeliveryFee(nz(delivery));
        p.setPlatformFee(nz(platform));
        p.setOtherFees(nz(other));
        p.setDiscount(nz(discount));
        p.setFinalTotal(total);
        p.setSource(source);
        p.setRecordedAt(Instant.now());
        return prices.save(p);
    }

    @Transactional(readOnly = true)
    public PageResponse<PriceDto> priceHistory(Long optionId, int page, int size) {
        RestaurantDeliveryOption o = options.findById(optionId).orElseThrow(() -> ApiException.notFound("Delivery option"));
        guard.managedRestaurant(o.getRestaurant().getId());
        return PageResponse.of(prices.findByOptionIdOrderByRecordedAtDesc(optionId, PageRequest.of(page, size)),
                DeliveryMapper::toDto);
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
