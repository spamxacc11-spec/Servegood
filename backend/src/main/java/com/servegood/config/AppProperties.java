package com.servegood.config;

import com.servegood.entity.enums.AdPlacement;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Typed view of the {@code app.*} block in application.yml. */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String timeZone,
        String frontendUrl,
        Cors cors,
        Jwt jwt,
        Storage storage,
        Hygiene hygiene,
        Advertising advertising,
        Bootstrap bootstrap,
        Seed seed) {

    public ZoneId zone() {
        return ZoneId.of(timeZone);
    }

    public record Cors(List<String> allowedOrigins) {}

    public record Jwt(String secret, int accessTokenMinutes, int refreshTokenDays, boolean secureCookie) {}

    public record Storage(String localDirectory, String publicBaseUrl) {}

    public record Hygiene(int validityMonths) {}

    public record Advertising(Map<AdPlacement, Integer> dailyRates) {}

    public record Bootstrap(String adminEmail, String adminPassword) {}

    public record Seed(boolean demo, String demoPassword) {}
}
