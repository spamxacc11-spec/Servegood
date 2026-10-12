package com.servegood.entity;

import com.servegood.entity.enums.HygieneCategory;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "hygiene_audit_items")
public class HygieneAuditItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "audit_id")
    private HygieneAudit audit;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private HygieneCategory category;

    /** 0 to 10. */
    @Column(nullable = false)
    private int score;

    /** Copied from the category at scoring time, so old audits keep their arithmetic. */
    @Column(nullable = false)
    private int weight;

    @Column(columnDefinition = "text")
    private String notes;
}
