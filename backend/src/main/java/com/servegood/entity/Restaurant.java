package com.servegood.entity;

import com.servegood.entity.enums.RestaurantStatus;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "restaurants")
public class Restaurant extends BaseEntity {

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, unique = true, length = 170)
    private String slug;

    @Column(columnDefinition = "text")
    private String description;

    @Column(length = 30)
    private String phone;

    private String email;

    @Column(length = 300)
    private String website;

    @Column(name = "price_level", nullable = false)
    private int priceLevel = 2;

    @Column(name = "cost_for_two")
    private Integer costForTwo;

    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    /** The identical basket every delivery price for this restaurant is quoted for. */
    @Column(name = "comparison_basket", length = 300)
    private String comparisonBasket;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RestaurantStatus status = RestaurantStatus.PENDING_APPROVAL;

    @Column(name = "status_reason", length = 500)
    private String statusReason;

    // Genuine rating aggregates, recomputed from VERIFIED reviews only.
    @Column(name = "avg_overall", precision = 3, scale = 2)
    private BigDecimal avgOverall;

    @Column(name = "avg_food", precision = 3, scale = 2)
    private BigDecimal avgFood;

    @Column(name = "avg_service", precision = 3, scale = 2)
    private BigDecimal avgService;

    @Column(name = "avg_hygiene", precision = 3, scale = 2)
    private BigDecimal avgHygiene;

    @Column(name = "review_count", nullable = false)
    private int reviewCount;

    // Audited hygiene, kept apart from consumer ratings.
    @Column(name = "hygiene_score")
    private Integer hygieneScore;

    @Column(name = "hygiene_audit_id")
    private Long hygieneAuditId;

    @Column(name = "hygiene_verified_until")
    private LocalDate hygieneVerifiedUntil;

    @Column(name = "view_count", nullable = false)
    private long viewCount;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @OneToOne(mappedBy = "restaurant", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private RestaurantAddress address;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "restaurant_category_assignments",
            joinColumns = @JoinColumn(name = "restaurant_id"),
            inverseJoinColumns = @JoinColumn(name = "category_id"))
    private Set<RestaurantCategory> categories = new HashSet<>();

    @OneToMany(mappedBy = "restaurant", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("dayOfWeek ASC, opensAt ASC")
    private List<OpeningHours> openingHours = new ArrayList<>();

    @OneToMany(mappedBy = "restaurant", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    private List<RestaurantImage> images = new ArrayList<>();

    public void setAddress(RestaurantAddress address) {
        this.address = address;
        if (address != null) {
            address.setRestaurant(this);
        }
    }

    public boolean isHygieneVerified(LocalDate today) {
        return hygieneScore != null && hygieneVerifiedUntil != null && !hygieneVerifiedUntil.isBefore(today);
    }

    public boolean isPublic() {
        return status == RestaurantStatus.APPROVED && deletedAt == null;
    }
}
