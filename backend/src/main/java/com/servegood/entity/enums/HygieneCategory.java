package com.servegood.entity.enums;

/**
 * The eight things a hygiene audit scores, each out of 10. Weights sum to 100,
 * so the overall score is directly a percentage: sum(score / 10 * weight).
 */
public enum HygieneCategory {
    KITCHEN_CLEANLINESS("Kitchen cleanliness", 15),
    FOOD_STORAGE("Food storage", 15),
    FOOD_HANDLING("Food handling", 15),
    STAFF_HYGIENE("Staff hygiene", 15),
    PEST_CONTROL("Pest control", 15),
    EQUIPMENT_CLEANLINESS("Equipment cleanliness", 10),
    WASTE_MANAGEMENT("Waste management", 8),
    PREMISES_CLEANLINESS("General premises cleanliness", 7);

    private final String label;
    private final int weight;

    HygieneCategory(String label, int weight) {
        this.label = label;
        this.weight = weight;
    }

    public String label() {
        return label;
    }

    public int weight() {
        return weight;
    }
}
