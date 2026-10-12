import { Faq } from "./components/Faq";
import { FeaturedRestaurants } from "./components/FeaturedRestaurants";
import { FollowTheMeal } from "./components/FollowTheMeal";
import { Hero } from "./components/Hero";
import { LaunchArea } from "./components/LaunchArea";
import { Partnerships } from "./components/Partnerships";
import { PriceLab } from "./components/PriceLab";
import { ReviewStandards } from "./components/ReviewStandards";
import { LandingDataProvider } from "./components/landing/LandingDataProvider";

/**
 * The landing page. Reading order is the story: the meal is revealed, the
 * review is explained, the price is compared, then the collection and the
 * partnership pitch. Header and footer come from the shared public layout.
 */
export default function App() {
  return (
    <LandingDataProvider>
      <Hero />
      <FollowTheMeal />
      <PriceLab />
      <FeaturedRestaurants />
      <LaunchArea />
      <ReviewStandards />
      <Partnerships />
      <Faq />
    </LandingDataProvider>
  );
}
