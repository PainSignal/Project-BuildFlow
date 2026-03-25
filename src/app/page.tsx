import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { BenefitsSection } from "@/components/landing/benefits-section";
import { HowItWorksSection } from "@/components/landing/how-it-works";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { PricingPreviewSection } from "@/components/landing/pricing-preview";
import { FinalCTASection } from "@/components/landing/final-cta";

export default function Home() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <BenefitsSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingPreviewSection />
      <FinalCTASection />
    </>
  );
}
