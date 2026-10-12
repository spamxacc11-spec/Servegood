/** Types mirroring the ServeGood API DTOs. Keep in step with backend/src/main/java/com/servegood/dto. */

export type RoleName = "CONSUMER" | "RESTAURANT_OWNER" | "REVIEWER" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED";
export type RestaurantStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type CategoryKind = "CUISINE" | "DINING_STYLE";
export type ReviewStatus = "PENDING" | "VERIFIED" | "REJECTED" | "FLAGGED";
export type ReportType =
  | "FAKE_REVIEW"
  | "INCORRECT_RESTAURANT_INFO"
  | "INAPPROPRIATE_CONTENT"
  | "INCORRECT_HYGIENE_INFO";
export type ReportStatus = "OPEN" | "RESOLVED" | "DISMISSED";
export type AssignmentStatus = "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type AuditStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
export type HygieneCategory =
  | "KITCHEN_CLEANLINESS"
  | "FOOD_STORAGE"
  | "FOOD_HANDLING"
  | "STAFF_HYGIENE"
  | "PEST_CONTROL"
  | "EQUIPMENT_CLEANLINESS"
  | "WASTE_MANAGEMENT"
  | "PREMISES_CLEANLINESS";
export type IntegrationType = "MANUAL" | "API";
export type PriceSource = "ADMIN_MANUAL" | "RESTAURANT_SUBMITTED" | "PROVIDER_API";
export type CampaignStatus = "DRAFT" | "PENDING" | "ACTIVE" | "PAUSED" | "EXPIRED" | "REJECTED";
export type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED";
export type AdPlacement = "HOMEPAGE" | "SEARCH_RESULTS" | "CATEGORY_PAGE" | "LOCAL_RECOMMENDATIONS";
export type FilePurpose =
  | "RESTAURANT"
  | "MENU_ITEM"
  | "REVIEW"
  | "HYGIENE_EVIDENCE"
  | "AVATAR"
  | "ADVERTISEMENT";
export type SearchSort =
  | "RELEVANCE"
  | "RATING"
  | "FOOD"
  | "HYGIENE"
  | "PRICE_ASC"
  | "PRICE_DESC"
  | "DISTANCE"
  | "REVIEWS"
  | "NEWEST";

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

// ---------------------------------------------------------------- auth

export interface User {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  roles: RoleName[];
  status: UserStatus;
  emailNotifications: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AuthResponse {
  accessToken: string;
  expiresInSeconds: number;
  user: User;
}

// ---------------------------------------------------------------- restaurants

export interface CategoryRef {
  id: number;
  name: string;
  slug: string;
  kind: CategoryKind;
}

export interface Category extends CategoryRef {
  description: string | null;
  active: boolean;
  sortOrder: number;
}

export interface Address {
  line1: string;
  line2: string | null;
  locality: string;
  city: string;
  state: string;
  postalCode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface OpeningHours {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
}

export interface RestaurantImage {
  id: number | null;
  url: string;
  altText: string | null;
  sortOrder: number | null;
}

export interface RatingSummary {
  overall: number | null;
  food: number | null;
  service: number | null;
  hygieneReported: number | null;
  reviewCount: number;
}

export interface HygieneSummary {
  score: number | null;
  tier: string | null;
  verified: boolean;
  verifiedUntil: string | null;
  lastAuditDate: string | null;
}

export interface RestaurantSummary {
  id: number;
  name: string;
  slug: string;
  coverImageUrl: string | null;
  locality: string | null;
  city: string | null;
  categories: CategoryRef[];
  priceLevel: number;
  costForTwo: number | null;
  ratings: RatingSummary;
  hygiene: HygieneSummary;
  openNow: boolean | null;
  deliveryAvailable: boolean;
  cheapestTotal: number | null;
  cheapestProvider: string | null;
  distanceKm: number | null;
  favorite: boolean | null;
}

export interface RestaurantDetail {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  priceLevel: number;
  costForTwo: number | null;
  coverImageUrl: string | null;
  comparisonBasket: string | null;
  status: RestaurantStatus;
  address: Address | null;
  categories: CategoryRef[];
  openingHours: OpeningHours[];
  images: RestaurantImage[];
  ratings: RatingSummary;
  ratingDistribution: Record<string, number>;
  hygiene: HygieneSummary;
  openNow: boolean | null;
  favorite: boolean | null;
  createdAt: string;
}

export interface RestaurantRequest {
  name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  priceLevel: number;
  costForTwo: number | null;
  coverImageUrl: string | null;
  comparisonBasket: string | null;
  address: Address;
  categoryIds: number[];
  openingHours: OpeningHours[];
  images: RestaurantImage[];
}

export interface OwnerRef {
  userId: number;
  fullName: string;
  email: string;
}

export interface AdminRestaurant {
  restaurant: RestaurantSummary;
  status: RestaurantStatus;
  statusReason: string | null;
  owners: OwnerRef[];
  viewCount: number;
  createdAt: string;
}

// ---------------------------------------------------------------- menus

export interface MenuItem {
  id: number;
  menuId: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  available: boolean;
  vegetarian: boolean;
  sortOrder: number;
}

export interface Menu {
  id: number;
  name: string;
  description: string | null;
  sortOrder: number;
  items: MenuItem[];
}

export interface DishHit {
  itemId: number;
  name: string;
  description: string | null;
  price: number;
  available: boolean;
  vegetarian: boolean;
  restaurantId: number;
  restaurantName: string;
  locality: string | null;
}

export interface UploadedFile {
  id: number;
  url: string;
  contentType: string;
  sizeBytes: number;
  purpose: FilePurpose;
}

// ---------------------------------------------------------------- reviews

export interface FoodRating {
  menuItemId: number | null;
  dishName: string;
  rating: number;
}

export interface ReviewResponse {
  id: number;
  body: string;
  responderName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: number;
  restaurantId: number;
  restaurantName: string;
  authorId: number;
  authorName: string;
  overallRating: number;
  foodRating: number;
  serviceRating: number;
  hygieneRating: number;
  title: string | null;
  comment: string;
  visitDate: string | null;
  status: ReviewStatus;
  reviewerReview: boolean;
  moderationNote: string | null;
  images: string[];
  foodRatings: FoodRating[];
  response: ReviewResponse | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRequest {
  overallRating: number;
  foodRating: number;
  serviceRating: number;
  hygieneRating: number;
  title: string | null;
  comment: string;
  visitDate: string | null;
  imageUrls: string[];
  foodRatings: FoodRating[];
}

export interface Report {
  id: number;
  type: ReportType;
  restaurantId: number;
  restaurantName: string;
  reviewId: number | null;
  reviewExcerpt: string | null;
  reporterName: string;
  details: string;
  status: ReportStatus;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

// ---------------------------------------------------------------- hygiene

export interface Criterion {
  category: HygieneCategory;
  label: string;
  weight: number;
}

export interface AuditItem extends Criterion {
  score: number;
  notes: string | null;
}

export interface Evidence {
  id: number | null;
  url: string;
  caption: string | null;
  category: HygieneCategory | null;
}

export interface Audit {
  id: number;
  restaurantId: number;
  restaurantName: string;
  reviewerId: number | null;
  reviewerName: string;
  assignmentId: number | null;
  auditDate: string;
  overallScore: number | null;
  tier: string | null;
  status: AuditStatus;
  findings: string | null;
  recommendations: string | null;
  decisionNote: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  validUntil: string | null;
  items: AuditItem[];
  evidence: Evidence[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditRequest {
  restaurantId: number;
  assignmentId: number | null;
  auditDate: string;
  items: { category: HygieneCategory; score: number; notes: string | null }[];
  findings: string | null;
  recommendations: string | null;
  evidence: { url: string; caption: string | null; category: HygieneCategory | null }[];
}

export interface PublicHygiene {
  score: number | null;
  tier: string | null;
  verified: boolean;
  verifiedUntil: string | null;
  latestAudit: Audit | null;
  history: { id: number; auditDate: string; score: number | null; status: AuditStatus }[];
}

export interface Assignment {
  id: number;
  reviewerId: number;
  reviewerName: string;
  restaurantId: number;
  restaurantName: string;
  locality: string | null;
  dueDate: string | null;
  status: AssignmentStatus;
  notes: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------- delivery

export interface Provider {
  id: number;
  name: string;
  slug: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  integrationType: IntegrationType;
  directChannel: boolean;
  active: boolean;
  sortOrder: number;
}

export interface Price {
  id: number;
  basketDescription: string;
  foodSubtotal: number;
  deliveryFee: number;
  platformFee: number;
  otherFees: number;
  discount: number;
  finalTotal: number;
  source: PriceSource;
  live: boolean;
  recordedByName: string | null;
  recordedAt: string;
}

export interface DeliveryOption {
  optionId: number;
  restaurantId: number;
  provider: Provider;
  orderingUrl: string | null;
  available: boolean;
  notes: string | null;
  currentPrice: Price | null;
  cheapest: boolean;
}

export interface DeliveryComparison {
  restaurantId: number;
  restaurantName: string;
  basket: string | null;
  options: DeliveryOption[];
  cheapest: DeliveryOption | null;
  savingVsHighest: number | null;
  lastUpdated: string | null;
  liveData: boolean;
  disclaimer: string;
}

export interface PriceRequest {
  basketDescription: string;
  foodSubtotal: number;
  deliveryFee: number;
  platformFee: number;
  otherFees: number;
  discount: number;
}

// ---------------------------------------------------------------- advertising

export interface Ad {
  id: number;
  placement: AdPlacement;
  headline: string | null;
  imageUrl: string | null;
  categoryId: number | null;
  impressions: number;
  clicks: number;
}

export interface Campaign {
  id: number;
  restaurantId: number;
  restaurantName: string;
  name: string;
  targetLocation: string | null;
  startDate: string;
  endDate: string;
  budget: number;
  estimatedCost: number;
  status: CampaignStatus;
  paymentStatus: PaymentStatus;
  statusReason: string | null;
  placements: Ad[];
  createdAt: string;
  reviewedAt: string | null;
}

export interface CampaignRequest {
  name: string;
  targetLocation: string | null;
  startDate: string;
  endDate: string;
  budget: number;
  placements: { placement: AdPlacement; headline: string | null; imageUrl: string | null; categoryId: number | null }[];
}

export interface Sponsored {
  adId: number;
  campaignId: number;
  placement: AdPlacement;
  headline: string | null;
  imageUrl: string | null;
  sponsored: true;
  restaurant: RestaurantSummary;
}

// ---------------------------------------------------------------- dashboards

export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface ActivityItem {
  kind: string;
  title: string;
  detail: string | null;
  link: string | null;
  at: string;
}

export interface OwnerOverview {
  restaurantId: number;
  restaurantName: string;
  status: RestaurantStatus;
  views30d: number;
  viewsTotal: number;
  dailyViews: { day: string; count: number }[];
  totalReviews: number;
  pendingReviews: number;
  unansweredReviews: number;
  avgOverall: number | null;
  avgFood: number | null;
  avgService: number | null;
  avgHygieneReported: number | null;
  hygieneScore: number | null;
  hygieneTier: string | null;
  hygieneVerified: boolean;
  favorites: number;
  activeCampaigns: number;
  recentReviews: Review[];
  recentActivity: ActivityItem[];
}

export interface ConsumerOverview {
  reviews: number;
  favorites: number;
  unreadNotifications: number;
  reportsFiled: number;
}

export interface ReviewerOverview {
  openAssignments: number;
  draftAudits: number;
  pendingAudits: number;
  approvedAudits: number;
  reviewsWritten: number;
}

export interface AdminStats {
  users: number;
  usersByRole: Record<RoleName, number>;
  restaurantsApproved: number;
  restaurantsPending: number;
  reviewsPending: number;
  reviewsFlagged: number;
  auditsPending: number;
  reportsOpen: number;
  campaignsPending: number;
  campaignsActive: number;
}

export interface PlatformStats {
  restaurants: number;
  verifiedRestaurants: number;
  verifiedReviews: number;
  localities: string[];
}

export interface AuditLog {
  id: number;
  actorId: number | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: number | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface SearchResult {
  restaurants: Page<RestaurantSummary>;
  dishes: DishHit[];
  sponsored: Sponsored[];
}
