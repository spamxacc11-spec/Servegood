import type { AdPlacement, PriceSource, ReportType } from "./types";

export const SOURCE_LABEL: Record<PriceSource, string> = {
  ADMIN_MANUAL: "Checked by ServeGood",
  RESTAURANT_SUBMITTED: "Reported by the restaurant",
  PROVIDER_API: "From the platform",
};

export const PLACEMENT_LABEL: Record<AdPlacement, string> = {
  HOMEPAGE: "Homepage",
  SEARCH_RESULTS: "Search results",
  CATEGORY_PAGE: "Category page",
  LOCAL_RECOMMENDATIONS: "Local recommendations",
};

export const REPORT_LABEL: Record<ReportType, string> = {
  FAKE_REVIEW: "Fake review",
  INCORRECT_RESTAURANT_INFO: "Incorrect restaurant info",
  INAPPROPRIATE_CONTENT: "Inappropriate content",
  INCORRECT_HYGIENE_INFO: "Incorrect hygiene info",
};
