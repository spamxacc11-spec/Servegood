import type { HygieneTier } from "@/data/restaurants";

/** Maps the API's tier label to the landing page's tier key, so both use one badge style. */
export function tierKey(tier: string | null | undefined): HygieneTier | null {
  switch (tier) {
    case "Verified Clean":
      return "verified";
    case "Standard Good":
      return "standard";
    case "Needs Attention":
      return "attention";
    default:
      return null;
  }
}

export function tierForScore(score: number | null | undefined): HygieneTier | null {
  if (score === null || score === undefined) return null;
  if (score >= 85) return "verified";
  return score >= 70 ? "standard" : "attention";
}
