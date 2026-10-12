package com.servegood.service;

import com.servegood.config.AppProperties;
import com.servegood.dto.HygieneDtos.AssignmentDto;
import com.servegood.dto.HygieneDtos.AssignmentRequest;
import com.servegood.dto.HygieneDtos.AuditDecisionRequest;
import com.servegood.dto.HygieneDtos.AuditDto;
import com.servegood.dto.HygieneDtos.AuditHistoryEntry;
import com.servegood.dto.HygieneDtos.AuditItemRequest;
import com.servegood.dto.HygieneDtos.AuditRequest;
import com.servegood.dto.HygieneDtos.CriterionDto;
import com.servegood.dto.HygieneDtos.EvidenceRequest;
import com.servegood.dto.HygieneDtos.PublicHygieneDto;
import com.servegood.dto.PageResponse;
import com.servegood.entity.HygieneAudit;
import com.servegood.entity.HygieneAuditItem;
import com.servegood.entity.HygieneEvidence;
import com.servegood.entity.Restaurant;
import com.servegood.entity.ReviewerAssignment;
import com.servegood.entity.User;
import com.servegood.entity.enums.AssignmentStatus;
import com.servegood.entity.enums.AuditStatus;
import com.servegood.entity.enums.HygieneCategory;
import com.servegood.entity.enums.NotificationType;
import com.servegood.entity.enums.RestaurantStatus;
import com.servegood.entity.enums.RoleName;
import com.servegood.exception.ApiException;
import com.servegood.mapper.HygieneMapper;
import com.servegood.repository.HygieneAuditRepository;
import com.servegood.repository.RestaurantRepository;
import com.servegood.repository.ReviewerAssignmentRepository;
import com.servegood.repository.UserRepository;
import com.servegood.security.AuthUser;
import com.servegood.security.CurrentUser;
import com.servegood.service.support.HygieneScoring;
import jakarta.persistence.criteria.Predicate;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Hygiene audits: DRAFT (reviewer) -> PENDING (submitted) -> APPROVED or
 * REJECTED (admin) -> EXPIRED (after the validity period, or when a newer audit
 * is approved). Only an APPROVED, unexpired audit makes a restaurant verified.
 */
@Service
public class HygieneService {

    private static final Logger log = LoggerFactory.getLogger(HygieneService.class);
    private static final Set<AssignmentStatus> OPEN = EnumSet.of(AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS);

    private final HygieneAuditRepository audits;
    private final ReviewerAssignmentRepository assignments;
    private final RestaurantRepository restaurants;
    private final UserRepository users;
    private final AccessGuard guard;
    private final CurrentUser currentUser;
    private final NotificationService notifications;
    private final AuditLogService auditLog;
    private final Clock clock;
    private final AppProperties props;

    public HygieneService(HygieneAuditRepository audits, ReviewerAssignmentRepository assignments,
                          RestaurantRepository restaurants, UserRepository users, AccessGuard guard,
                          CurrentUser currentUser, NotificationService notifications, AuditLogService auditLog,
                          Clock clock, AppProperties props) {
        this.audits = audits;
        this.assignments = assignments;
        this.restaurants = restaurants;
        this.users = users;
        this.guard = guard;
        this.currentUser = currentUser;
        this.notifications = notifications;
        this.auditLog = auditLog;
        this.clock = clock;
        this.props = props;
    }

    public List<CriterionDto> criteria() {
        return Arrays.stream(HygieneCategory.values()).map(c -> new CriterionDto(c, c.label(), c.weight())).toList();
    }

    // ------------------------------------------------------------------ public

    @Transactional(readOnly = true)
    public PublicHygieneDto publicHygiene(Long restaurantId) {
        Restaurant r = restaurants.findByIdAndDeletedAtIsNull(restaurantId).filter(Restaurant::isPublic)
                .orElseThrow(() -> ApiException.notFound("Restaurant"));
        List<HygieneAudit> published = audits.findByRestaurantIdAndStatusInOrderByAuditDateDescIdDesc(restaurantId,
                List.of(AuditStatus.APPROVED, AuditStatus.EXPIRED));
        LocalDate today = LocalDate.now(clock);
        boolean verified = r.isHygieneVerified(today);
        HygieneAudit latest = published.isEmpty() ? null : published.get(0);
        return new PublicHygieneDto(
                r.getHygieneScore(),
                verified ? HygieneScoring.tier(r.getHygieneScore()) : null,
                verified,
                r.getHygieneVerifiedUntil(),
                latest == null ? null : HygieneMapper.toDto(latest, false),
                published.stream().map(a -> new AuditHistoryEntry(a.getId(), a.getAuditDate(), a.getOverallScore(), a.getStatus()))
                        .toList());
    }

    // ------------------------------------------------------------------ owner

    /** Owners see every audit of their restaurant except reviewers' unsubmitted drafts. */
    @Transactional(readOnly = true)
    public List<AuditDto> forOwner(Long restaurantId) {
        guard.managedRestaurant(restaurantId);
        return audits.findByRestaurantIdOrderByAuditDateDescIdDesc(restaurantId).stream()
                .filter(a -> a.getStatus() != AuditStatus.DRAFT)
                .map(a -> HygieneMapper.toDto(a, false))
                .toList();
    }

    // ------------------------------------------------------------------ assignments

    @Transactional
    public AssignmentDto assign(AssignmentRequest request) {
        User reviewer = users.findById(request.reviewerId()).filter(User::isActive)
                .filter(u -> u.hasRole(RoleName.REVIEWER))
                .orElseThrow(() -> ApiException.badRequest("Choose an active reviewer"));
        Restaurant r = restaurants.findByIdAndDeletedAtIsNull(request.restaurantId())
                .orElseThrow(() -> ApiException.notFound("Restaurant"));
        if (r.getStatus() == RestaurantStatus.REJECTED) {
            throw ApiException.badRequest("This restaurant was rejected and cannot be audited");
        }
        if (assignments.existsByReviewerIdAndRestaurantIdAndStatusIn(reviewer.getId(), r.getId(), OPEN)) {
            throw ApiException.conflict("This reviewer already has an open assignment for this restaurant");
        }
        ReviewerAssignment a = new ReviewerAssignment();
        a.setReviewer(reviewer);
        a.setRestaurant(r);
        a.setAssignedBy(currentUser.entity());
        a.setDueDate(request.dueDate());
        a.setNotes(request.notes() == null || request.notes().isBlank() ? null : request.notes().trim());
        assignments.save(a);
        auditLog.record("AUDIT_ASSIGNED", "RESTAURANT", r.getId(), "reviewer=" + reviewer.getEmail());
        notifications.notify(reviewer, NotificationType.AUDIT_ASSIGNED, "New audit assignment",
                "You have been asked to audit " + r.getName()
                        + (request.dueDate() == null ? "." : " by " + request.dueDate() + "."),
                "/reviewer/assignments");
        return HygieneMapper.toDto(a);
    }

    @Transactional(readOnly = true)
    public PageResponse<AssignmentDto> allAssignments(AssignmentStatus status, Long reviewerId, int page, int size) {
        Specification<ReviewerAssignment> spec = (root, q, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (status != null) {
                p.add(cb.equal(root.get("status"), status));
            }
            if (reviewerId != null) {
                p.add(cb.equal(root.get("reviewer").get("id"), reviewerId));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        return PageResponse.of(assignments.findAll(spec, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))),
                HygieneMapper::toDto);
    }

    @Transactional(readOnly = true)
    public PageResponse<AssignmentDto> myAssignments(boolean openOnly, int page, int size) {
        Set<AssignmentStatus> statuses = openOnly ? OPEN : EnumSet.allOf(AssignmentStatus.class);
        return PageResponse.of(assignments.findByReviewerIdAndStatusIn(currentUser.id(), statuses,
                        PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "dueDate").and(Sort.by("createdAt")))),
                HygieneMapper::toDto);
    }

    @Transactional
    public AssignmentDto updateAssignmentStatus(Long id, AssignmentStatus status) {
        ReviewerAssignment a = assignments.findById(id).orElseThrow(() -> ApiException.notFound("Assignment"));
        AuthUser user = currentUser.require();
        boolean mine = a.getReviewer().getId().equals(user.id());
        if (!user.isAdmin() && !mine) {
            throw ApiException.forbidden("This assignment is not yours");
        }
        if (!user.isAdmin() && status != AssignmentStatus.IN_PROGRESS) {
            throw ApiException.forbidden("Reviewers can only mark an assignment as in progress");
        }
        a.setStatus(status);
        auditLog.record("ASSIGNMENT_" + status, "ASSIGNMENT", a.getId(), null);
        return HygieneMapper.toDto(a);
    }

    // ------------------------------------------------------------------ reviewer audits

    @Transactional
    public AuditDto createAudit(AuditRequest request) {
        guard.requireAssignedReviewer(request.restaurantId());
        Restaurant r = restaurants.findByIdAndDeletedAtIsNull(request.restaurantId())
                .orElseThrow(() -> ApiException.notFound("Restaurant"));
        HygieneAudit audit = new HygieneAudit();
        audit.setRestaurant(r);
        audit.setReviewer(currentUser.entity());
        if (request.assignmentId() != null) {
            ReviewerAssignment a = assignments.findById(request.assignmentId())
                    .filter(x -> x.getRestaurant().getId().equals(r.getId()) && x.getReviewer().getId().equals(currentUser.id()))
                    .orElseThrow(() -> ApiException.badRequest("That assignment does not match this restaurant"));
            audit.setAssignment(a);
            if (a.getStatus() == AssignmentStatus.ASSIGNED) {
                a.setStatus(AssignmentStatus.IN_PROGRESS);
            }
        }
        apply(audit, request);
        audits.save(audit);
        auditLog.record("HYGIENE_AUDIT_DRAFTED", "HYGIENE_AUDIT", audit.getId(), "restaurant=" + r.getId());
        return HygieneMapper.toDto(audit, true);
    }

    @Transactional
    public AuditDto updateAudit(Long id, AuditRequest request) {
        HygieneAudit audit = ownEditableAudit(id);
        if (!audit.getRestaurant().getId().equals(request.restaurantId())) {
            throw ApiException.badRequest("An audit cannot be moved to a different restaurant");
        }
        apply(audit, request);
        if (audit.getStatus() == AuditStatus.REJECTED) {
            // Reworking a rejected audit returns it to draft for resubmission.
            audit.setStatus(AuditStatus.DRAFT);
        }
        auditLog.record("HYGIENE_AUDIT_UPDATED", "HYGIENE_AUDIT", audit.getId(), "score=" + audit.getOverallScore());
        return HygieneMapper.toDto(audit, true);
    }

    @Transactional
    public AuditDto submit(Long id) {
        HygieneAudit audit = ownEditableAudit(id);
        Set<HygieneCategory> missing = HygieneScoring.missing(audit.getItems());
        if (!missing.isEmpty()) {
            throw ApiException.badRequest("Score every category before submitting. Missing: "
                    + missing.stream().map(HygieneCategory::label).toList());
        }
        if (audit.getFindings() == null || audit.getFindings().isBlank()) {
            throw ApiException.badRequest("Add findings before submitting");
        }
        audit.setStatus(AuditStatus.PENDING);
        audit.setSubmittedAt(Instant.now());
        audit.setDecisionNote(null);
        auditLog.record("HYGIENE_AUDIT_SUBMITTED", "HYGIENE_AUDIT", audit.getId(), "score=" + audit.getOverallScore());
        notifications.notifyRole(RoleName.ADMIN, NotificationType.HYGIENE_AUDIT_SUBMITTED, "Hygiene audit awaiting approval",
                audit.getRestaurant().getName() + " scored " + audit.getOverallScore() + "/100.", "/admin/audits?status=PENDING");
        return HygieneMapper.toDto(audit, true);
    }

    @Transactional
    public void deleteDraft(Long id) {
        HygieneAudit audit = ownEditableAudit(id);
        if (audit.getStatus() != AuditStatus.DRAFT) {
            throw ApiException.badRequest("Only drafts can be deleted");
        }
        audits.delete(audit);
        auditLog.record("HYGIENE_AUDIT_DELETED", "HYGIENE_AUDIT", id, null);
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditDto> myAudits(AuditStatus status, int page, int size) {
        Long me = currentUser.id();
        Specification<HygieneAudit> spec = (root, q, cb) -> status == null
                ? cb.equal(root.get("reviewer").get("id"), me)
                : cb.and(cb.equal(root.get("reviewer").get("id"), me), cb.equal(root.get("status"), status));
        return PageResponse.of(audits.findAll(spec, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt"))),
                a -> HygieneMapper.toDto(a, true));
    }

    @Transactional(readOnly = true)
    public AuditDto get(Long id) {
        HygieneAudit audit = audits.findById(id).orElseThrow(() -> ApiException.notFound("Hygiene audit"));
        AuthUser user = currentUser.require();
        if (!user.isAdmin() && !audit.getReviewer().getId().equals(user.id())) {
            throw ApiException.forbidden("You can only open your own audits");
        }
        return HygieneMapper.toDto(audit, true);
    }

    private HygieneAudit ownEditableAudit(Long id) {
        HygieneAudit audit = audits.findById(id).orElseThrow(() -> ApiException.notFound("Hygiene audit"));
        if (!audit.getReviewer().getId().equals(currentUser.id())) {
            throw ApiException.forbidden("You can only edit your own audits");
        }
        if (audit.getStatus() != AuditStatus.DRAFT && audit.getStatus() != AuditStatus.REJECTED) {
            throw ApiException.badRequest("Submitted audits cannot be changed");
        }
        return audit;
    }

    private void apply(HygieneAudit audit, AuditRequest r) {
        audit.setAuditDate(r.auditDate());
        audit.setFindings(blank(r.findings()));
        audit.setRecommendations(blank(r.recommendations()));

        Set<HygieneCategory> seen = new HashSet<>();
        audit.getItems().clear();
        for (AuditItemRequest i : r.items()) {
            if (!seen.add(i.category())) {
                throw ApiException.badRequest("Each category can only be scored once");
            }
            HygieneAuditItem item = new HygieneAuditItem();
            item.setAudit(audit);
            item.setCategory(i.category());
            item.setScore(i.score());
            item.setWeight(i.category().weight());
            item.setNotes(blank(i.notes()));
            audit.getItems().add(item);
        }
        audit.setOverallScore(audit.getItems().isEmpty() ? null : HygieneScoring.overallScore(audit.getItems()));

        audit.getEvidence().clear();
        if (r.evidence() != null) {
            for (EvidenceRequest e : r.evidence()) {
                HygieneEvidence ev = new HygieneEvidence();
                ev.setAudit(audit);
                ev.setUrl(e.url());
                ev.setCaption(blank(e.caption()));
                ev.setCategory(e.category());
                audit.getEvidence().add(ev);
            }
        }
    }

    // ------------------------------------------------------------------ admin decisions

    @Transactional(readOnly = true)
    public PageResponse<AuditDto> adminSearch(AuditStatus status, Long restaurantId, int page, int size) {
        Specification<HygieneAudit> spec = (root, q, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (status != null) {
                p.add(cb.equal(root.get("status"), status));
            } else {
                // Drafts are the reviewer's private working copies.
                p.add(cb.notEqual(root.get("status"), AuditStatus.DRAFT));
            }
            if (restaurantId != null) {
                p.add(cb.equal(root.get("restaurant").get("id"), restaurantId));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        Sort sort = status == AuditStatus.PENDING ? Sort.by(Sort.Direction.ASC, "submittedAt") : Sort.by(Sort.Direction.DESC, "updatedAt");
        return PageResponse.of(audits.findAll(spec, PageRequest.of(page, size, sort)), a -> HygieneMapper.toDto(a, true));
    }

    @Transactional
    public AuditDto decide(Long id, AuditDecisionRequest request) {
        HygieneAudit audit = audits.findById(id).orElseThrow(() -> ApiException.notFound("Hygiene audit"));
        if (audit.getStatus() != AuditStatus.PENDING) {
            throw ApiException.badRequest("Only submitted audits can be approved or rejected");
        }
        if (audit.getReviewer().getId().equals(currentUser.id())) {
            throw ApiException.forbidden("An audit must be approved by someone other than its reviewer");
        }
        LocalDate today = LocalDate.now(clock);
        audit.setDecidedAt(Instant.now());
        audit.setDecidedBy(currentUser.entity());
        audit.setDecisionNote(blank(request.note()));
        Restaurant r = audit.getRestaurant();

        if (Boolean.TRUE.equals(request.approve())) {
            LocalDate validUntil = audit.getAuditDate().plusMonths(props.hygiene().validityMonths());
            if (validUntil.isBefore(today)) {
                throw ApiException.badRequest("This audit is older than the validity period and cannot be approved");
            }
            audit.setStatus(AuditStatus.APPROVED);
            audit.setValidUntil(validUntil);
            // A newer approved audit supersedes older ones.
            audits.findByRestaurantIdAndStatusInOrderByAuditDateDescIdDesc(r.getId(), List.of(AuditStatus.APPROVED)).stream()
                    .filter(other -> !other.getId().equals(audit.getId()))
                    .filter(other -> !other.getAuditDate().isAfter(audit.getAuditDate()))
                    .forEach(other -> other.setStatus(AuditStatus.EXPIRED));
            boolean newest = r.getHygieneAuditId() == null || audits.findById(r.getHygieneAuditId())
                    .map(cur -> !cur.getAuditDate().isAfter(audit.getAuditDate()))
                    .orElse(true);
            if (newest) {
                r.setHygieneScore(audit.getOverallScore());
                r.setHygieneAuditId(audit.getId());
                r.setHygieneVerifiedUntil(validUntil);
            }
            if (audit.getAssignment() != null) {
                audit.getAssignment().setStatus(AssignmentStatus.COMPLETED);
            }
            auditLog.record("HYGIENE_AUDIT_APPROVED", "HYGIENE_AUDIT", audit.getId(),
                    "restaurant=" + r.getId() + " score=" + audit.getOverallScore());
            String body = r.getName() + " scored " + audit.getOverallScore() + "/100 ("
                    + HygieneScoring.tier(audit.getOverallScore()) + "), valid until " + validUntil + ".";
            notifications.notify(audit.getReviewer(), NotificationType.HYGIENE_AUDIT_APPROVED, "Audit approved", body,
                    "/reviewer/audits");
            notifications.notifyOwners(r.getId(), NotificationType.HYGIENE_AUDIT_APPROVED, "Hygiene audit approved", body,
                    "/restaurant-dashboard/hygiene?restaurant=" + r.getId());
        } else {
            if (audit.getDecisionNote() == null) {
                throw ApiException.badRequest("Explain what the reviewer needs to fix");
            }
            audit.setStatus(AuditStatus.REJECTED);
            auditLog.record("HYGIENE_AUDIT_REJECTED", "HYGIENE_AUDIT", audit.getId(), audit.getDecisionNote());
            notifications.notify(audit.getReviewer(), NotificationType.HYGIENE_AUDIT_REJECTED, "Audit sent back",
                    "Your audit of " + r.getName() + " needs changes: " + audit.getDecisionNote(), "/reviewer/audits/" + audit.getId());
        }
        return HygieneMapper.toDto(audit, true);
    }

    /** Daily: approved audits past their validity become EXPIRED; restaurants stop showing as verified. */
    @Scheduled(cron = "0 15 0 * * *", zone = "${app.time-zone}")
    @Transactional
    public void expireAudits() {
        LocalDate today = LocalDate.now(clock);
        List<HygieneAudit> stale = audits.findByStatusAndValidUntilBefore(AuditStatus.APPROVED, today);
        for (HygieneAudit a : stale) {
            a.setStatus(AuditStatus.EXPIRED);
            notifications.notifyOwners(a.getRestaurant().getId(), NotificationType.HYGIENE_AUDIT_EXPIRED,
                    "Hygiene verification expired",
                    "The hygiene audit for " + a.getRestaurant().getName() + " has expired. Request a new audit to stay verified.",
                    "/restaurant-dashboard/hygiene?restaurant=" + a.getRestaurant().getId());
        }
        if (!stale.isEmpty()) {
            log.info("Expired {} hygiene audit(s)", stale.size());
        }
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
