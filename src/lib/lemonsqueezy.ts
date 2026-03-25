import { lemonSqueezySetup, createCheckout, getSubscription, cancelSubscription } from "@lemonsqueezy/lemonsqueezy.js";

// Initialize Lemon Squeezy client
export function initLemonSqueezy() {
  lemonSqueezySetup({
    apiKey: process.env.LEMONSQUEEZY_API_KEY,
    onError: (error) => {
      console.error("Lemon Squeezy error:", error);
    },
  });
}

// Plan configuration
export const PLANS = {
  solo: {
    name: "Solo",
    monthlyPrice: 29,
    annualPrice: 278.40, // 20% discount
    maxProjects: 10,
    maxSeats: 1,
    monthlyVariantId: process.env.LEMONSQUEEZY_SOLO_MONTHLY_VARIANT_ID,
    annualVariantId: process.env.LEMONSQUEEZY_SOLO_ANNUAL_VARIANT_ID,
  },
  team: {
    name: "Team",
    monthlyPrice: 69,
    annualPrice: 662.40, // 20% discount
    maxProjects: Infinity,
    maxSeats: 5,
    monthlyVariantId: process.env.LEMONSQUEEZY_TEAM_MONTHLY_VARIANT_ID,
    annualVariantId: process.env.LEMONSQUEEZY_TEAM_ANNUAL_VARIANT_ID,
  },
  growth: {
    name: "Growth",
    monthlyPrice: 149,
    annualPrice: 1430.40, // 20% discount
    maxProjects: Infinity,
    maxSeats: 15,
    monthlyVariantId: process.env.LEMONSQUEEZY_GROWTH_MONTHLY_VARIANT_ID,
    annualVariantId: process.env.LEMONSQUEEZY_GROWTH_ANNUAL_VARIANT_ID,
  },
} as const;

export type PlanTier = keyof typeof PLANS;
export type BillingInterval = "monthly" | "annual";

// Get variant ID for a plan and billing interval
export function getVariantId(tier: PlanTier, interval: BillingInterval): string | undefined {
  const plan = PLANS[tier];
  return interval === "monthly" ? plan.monthlyVariantId : plan.annualVariantId;
}

// Create a checkout session
export async function createCheckoutSession(
  orgId: string,
  tier: PlanTier,
  interval: BillingInterval,
  email?: string
): Promise<string> {
  initLemonSqueezy();

  const variantId = getVariantId(tier, interval);
  if (!variantId) {
    throw new Error(`Variant ID not configured for ${tier} ${interval}`);
  }

  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  if (!storeId) {
    throw new Error("LEMONSQUEEZY_STORE_ID not configured");
  }

  const response = await createCheckout(storeId, variantId, {
    checkoutData: {
      email,
      custom: {
        org_id: orgId,
      },
    },
    checkoutOptions: {
      embed: false,
      media: true,
      logo: true,
      desc: true,
      discount: true,
      dark: false,
      subscriptionPreview: true,
    },
  });

  if (response.error) {
    throw new Error(`Failed to create checkout: ${response.error.message}`);
  }

  return response.data?.data.attributes.url ?? "";
}

// Get subscription details
export async function getSubscriptionDetails(subscriptionId: string) {
  initLemonSqueezy();

  const response = await getSubscription(subscriptionId);

  if (response.error) {
    throw new Error(`Failed to get subscription: ${response.error.message}`);
  }

  return response.data?.data;
}

// Cancel a subscription
export async function cancelLemonSqueezySubscription(subscriptionId: string) {
  initLemonSqueezy();

  const response = await cancelSubscription(subscriptionId);

  if (response.error) {
    throw new Error(`Failed to cancel subscription: ${response.error.message}`);
  }

  return response.data?.data;
}

// Get plan tier from variant ID
export function getPlanTierFromVariant(variantId: string): PlanTier | null {
  for (const [tier, plan] of Object.entries(PLANS)) {
    if (plan.monthlyVariantId === variantId || plan.annualVariantId === variantId) {
      return tier as PlanTier;
    }
  }
  return null;
}

// Get billing interval from variant ID
export function getBillingIntervalFromVariant(variantId: string): BillingInterval | null {
  for (const plan of Object.values(PLANS)) {
    if (plan.monthlyVariantId === variantId) return "monthly";
    if (plan.annualVariantId === variantId) return "annual";
  }
  return null;
}

// Get plan limits for a tier
export function getPlanLimits(tier: PlanTier | "trial") {
  if (tier === "trial") {
    return {
      maxProjects: Infinity,
      maxSeats: 5, // Team-tier limits during trial
    };
  }
  return {
    maxProjects: PLANS[tier].maxProjects,
    maxSeats: PLANS[tier].maxSeats,
  };
}

// Format price for display
export function formatPrice(price: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat("en-EU", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}
