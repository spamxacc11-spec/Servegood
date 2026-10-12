import biryaniImg from "../assets/food/biryani.jpg";
import choleImg from "../assets/food/chole-bhature.jpg";
import dosaImg from "../assets/food/dosa.jpg";
import fishCurryImg from "../assets/food/fish-curry.jpg";
import paneerImg from "../assets/food/paneer-tikka.jpg";
import tandoorImg from "../assets/food/tandoor.jpg";

/**
 * Fallback sample content for the landing page, used only when the API cannot
 * be reached. Nothing here is a published review, a live price, or a completed
 * inspection, and the UI labels every record from this file as sample data.
 */

export type HygieneTier = "verified" | "standard" | "attention";

export type Platform = string;

/** One platform's quote for a single defined basket, in rupees. */
export interface PriceQuote {
  platform: Platform;
  /** Menu price of the basket items on that platform. */
  items: number;
  /** Packaging, platform and handling charges. */
  fees: number;
  /** Delivery charge. */
  delivery: number;
  /** Any discount taken off the total. */
  discount?: number;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  neighbourhood: string;
  image: string;
  imageAlt: string;
  /** Unsplash photo id, recorded so the source stays traceable. */
  imageSource: string;
  /** Null when the restaurant has no current approved hygiene audit. */
  tier: HygieneTier | null;
  /** A single observation, written as an example of what a review note looks like. */
  reviewNote: string;
  /** The identical basket every platform below is quoted for. */
  basket: string;
  quotes: PriceQuote[];
  /** Set for listings loaded from the API: the restaurant's page in the app. */
  href?: string;
  /** When the newest price was recorded, for listings loaded from the API. */
  lastUpdated?: string | null;
}

export interface QuoteTotal extends PriceQuote {
  total: number;
}

export interface PriceSummary {
  rows: QuoteTotal[];
  best: QuoteTotal;
  highest: QuoteTotal;
  saving: number;
}

/**
 * Derives every displayed number from the quote parts, so the totals and the
 * advertised saving can never drift away from the rows they summarise.
 */
export function summarisePrices(quotes: PriceQuote[]): PriceSummary {
  const rows: QuoteTotal[] = quotes.map((q) => ({
    ...q,
    total: q.items + q.fees + q.delivery - (q.discount ?? 0),
  }));
  const sorted = [...rows].sort((a, b) => a.total - b.total);
  const best = sorted[0];
  const highest = sorted[sorted.length - 1];
  return { rows, best, highest, saving: highest.total - best.total };
}

export const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

export const RESTAURANTS: Restaurant[] = [
  {
    id: "bawarchi",
    name: "Bawarchi Biryani & Kebabs",
    cuisine: "Biryani and Mughlai",
    neighbourhood: "Lokhandwala, Andheri West",
    image: biryaniImg,
    imageAlt: "Chicken biryani with raita and sliced onion on a white plate",
    imageSource: "Unsplash photo-1589302168068-964664d93dc0",
    tier: "verified",
    reviewNote:
      "Example note: dum pots covered between services, steel prep surfaces wiped down between orders, spices stored in sealed containers.",
    basket: "1 chicken dum biryani, 1 seekh kebab plate",
    quotes: [
      { platform: "Swiggy", items: 486, fees: 38, delivery: 29 },
      { platform: "Zomato", items: 545, fees: 45, delivery: 35 },
      { platform: "Direct order", items: 470, fees: 20, delivery: 79 },
    ],
  },
  {
    id: "murugan",
    name: "Murugan Idli & Tiffin Room",
    cuisine: "South Indian tiffin",
    neighbourhood: "Chakala, Andheri East",
    image: dosaImg,
    imageAlt: "Crisp dosa served with potato masala, sambar and three chutneys",
    imageSource: "Unsplash photo-1668236543090-82eba5ee5976",
    tier: "verified",
    reviewNote:
      "Example note: steamers cleaned between batches, banana leaves rinsed before service, filtered water at the counter, dining floor mopped on a rota.",
    basket: "2 ghee podi idli, 1 masala dosa, 2 filter coffee",
    quotes: [
      { platform: "Swiggy", items: 312, fees: 31, delivery: 25 },
      { platform: "Zomato", items: 305, fees: 34, delivery: 29 },
      { platform: "Direct order", items: 290, fees: 15, delivery: 20 },
    ],
  },
  {
    id: "punjab-grill",
    name: "Punjab Grill & Dhaba",
    cuisine: "North Indian and tandoor",
    neighbourhood: "Four Bungalows, Andheri West",
    image: tandoorImg,
    imageAlt: "Marinated chicken and vegetable skewers cooking over a charcoal grill",
    imageSource: "Unsplash photo-1705359573325-f2006d5e459f",
    tier: "standard",
    reviewNote:
      "Example note: produce washed on arrival and storage kept covered. Tandoor bay needs a firmer cleaning rota between the lunch and dinner rush.",
    basket: "1 butter chicken, 4 tandoori roti, 1 dal makhani",
    quotes: [
      { platform: "Swiggy", items: 742, fees: 56, delivery: 39 },
      { platform: "Zomato", items: 698, fees: 61, delivery: 25 },
      { platform: "Direct order", items: 680, fees: 25, delivery: 89 },
    ],
  },

  {
    id: "sahyadri-chaat",
    name: "Sahyadri Chaat & Chole House",
    cuisine: "Chaat and North Indian snacks",
    neighbourhood: "Marol, Andheri East",
    image: choleImg,
    imageAlt: "A bowl of chana masala topped with coriander and ginger, beside fried bhatura bread",
    imageSource: "Unsplash photo-1788602564560-9bcbf0f9acb6",
    tier: "verified",
    reviewNote:
      "Example note: frying oil logged and changed daily, chutneys kept on ice through service, counter cloths swapped between batches.",
    basket: "1 chole bhature, 1 samosa chaat, 2 masala chai",
    quotes: [
      { platform: "Swiggy", items: 268, fees: 26, delivery: 25 },
      { platform: "Zomato", items: 252, fees: 24, delivery: 22 },
      { platform: "Direct order", items: 245, fees: 15, delivery: 49 },
    ],
  },
  {
    id: "neel-kamal",
    name: "Neel Kamal Tandoor Kitchen",
    cuisine: "Vegetarian tandoor",
    neighbourhood: "Seven Bungalows, Andheri West",
    image: paneerImg,
    imageAlt: "Metal skewers of marinated paneer, mushrooms and peppers resting after grilling",
    imageSource: "Unsplash photo-1788843304145-bec146aa83c5",
    tier: "standard",
    reviewNote:
      "Example note: marinades held in covered steel and dated. Cold storage runs warmer than the checklist allows and the reviewer asked for a thermometer log.",
    basket: "1 paneer tikka platter, 2 butter naan, 1 dal tadka",
    quotes: [
      { platform: "Swiggy", items: 512, fees: 44, delivery: 29 },
      { platform: "Zomato", items: 535, fees: 48, delivery: 35 },
      { platform: "Direct order", items: 495, fees: 20, delivery: 39 },
    ],
  },
  {
    id: "konkan-coast",
    name: "Konkan Coast Fish Curry House",
    cuisine: "Goan and coastal",
    neighbourhood: "Versova, Andheri West",
    image: fishCurryImg,
    imageAlt: "A fish curry served with rice, lime and a side of nuts",
    imageSource: "Unsplash photo-1761314036779-84078bec535c",
    tier: "verified",
    reviewNote:
      "Example note: catch iced on arrival and cleaned at a separate sink, raw and cooked boards colour coded, floor drains clear at the end of service.",
    basket: "1 fish curry rice thali, 1 prawn balchao",
    quotes: [
      { platform: "Swiggy", items: 425, fees: 32, delivery: 25 },
      { platform: "Zomato", items: 448, fees: 41, delivery: 25 },
      { platform: "Direct order", items: 420, fees: 18, delivery: 59 },
    ],
  },
];

export interface TierDefinition {
  tier: HygieneTier;
  label: string;
  summary: string;
  detail: string;
}

export const TIERS: TierDefinition[] = [
  {
    tier: "verified",
    label: "Verified Clean",
    summary: "Nothing outstanding at the time of the visit.",
    detail:
      "Prep surfaces, cold storage, staff handling and the dining area all met the checklist, and the reviewer had no follow-up items to record.",
  },
  {
    tier: "standard",
    label: "Standard Good",
    summary: "Safe to eat at, with one or two things to tighten.",
    detail:
      "The kitchen met the checklist overall, but the reviewer noted something worth improving, such as clutter in a prep bay or an inconsistent cleaning rota.",
  },
  {
    tier: "attention",
    label: "Needs Attention",
    summary: "Concerns recorded. Listing held back until a re-visit.",
    detail:
      "The reviewer recorded issues that need fixing before the kitchen appears as reviewed. ServeGood would schedule a second visit rather than publish a rating.",
  },
];

export interface Faq {
  q: string;
  a: string;
}

export const FAQS: Faq[] = [
  {
    q: "Where does ServeGood work?",
    a: "ServeGood starts in Andheri, Mumbai. Listings, hygiene audits and price checks cover restaurants there first, before any other neighbourhood.",
  },
  {
    q: "Who carries out the hygiene audits?",
    a: "ServeGood reviewers visit a kitchen in person and score eight areas, from food storage and handling to pest control and waste. An admin checks every audit before it is published, and an approved audit stays valid for twelve months. It is ServeGood's own framework, not a government rating and not a health guarantee.",
  },
  {
    q: "Are the delivery prices live?",
    a: "No. Prices are entered by ServeGood staff, or reported by the restaurant and labelled as such, for one identical basket on each option. Every total shows when it was last updated. Always check the final price on the platform before you order.",
  },
  {
    q: "Could a restaurant pay for a better hygiene tier or rating?",
    a: "No. Tiers come from the audit checklist and ratings come from moderated diner reviews. Restaurants can pay for sponsored placement, which is always labelled Sponsored, shown in its own slot, and never changes a rating, a review or a hygiene score.",
  },
  {
    q: "How are reviews checked?",
    a: "Every diner review is read by a moderator before it is published and counts towards a rating. You can report a review that looks fake or inappropriate, and restaurants can reply publicly but cannot edit or hide reviews.",
  },
];
