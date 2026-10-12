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
@Table(name = "hygiene_evidence")
public class HygieneEvidence extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "audit_id")
    private HygieneAudit audit;

    @Column(nullable = false, length = 500)
    private String url;

    @Column(length = 250)
    private String caption;

    @Enumerated(EnumType.STRING)
    @Column(length = 40)
    private HygieneCategory category;
}
