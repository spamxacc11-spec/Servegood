package com.servegood.service.delivery;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * Extension point for real delivery-platform integrations.
 *
 * No implementation ships today, because no provider API is connected. To add
 * one: implement this interface as a Spring bean whose {@link #providerSlug()}
 * matches a delivery_providers.slug, and set that provider's integration_type
 * to API. {@link DeliveryRefreshService} will then fetch quotes through it and
 * record them with source PROVIDER_API, which is the only source the UI ever
 * labels as live.
 */
public interface DeliveryQuoteClient {

    String providerSlug();

    /**
     * @param externalReference the restaurant's ordering URL on that platform, used to identify it
     * @param basketDescription the basket to price
     */
    Optional<Quote> fetchQuote(String externalReference, String basketDescription);

    record Quote(
            BigDecimal foodSubtotal,
            BigDecimal deliveryFee,
            BigDecimal platformFee,
            BigDecimal otherFees,
            BigDecimal discount) {}
}
