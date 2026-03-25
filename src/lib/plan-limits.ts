import { PrismaClient } from "@prisma/client";
import { getPlanLimits, type PlanTier } from "./lemonsqueezy";

export interface PlanLimitCheck {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number;
}

// Determine the effective plan tier for an organization
export async function getEffectivePlanTier(
  org: {
    subscriptionTier: string | null;
    subscriptionStatus: string | null;
    trialEndsAt: Date | null;
  }
): Promise<PlanTier | "trial" | "free"> {
  const now = new Date();

  // Check if in trial period
  if (org.trialEndsAt && new Date(org.trialEndsAt) > now) {
    return "trial";
  }

  // Check if has active subscription
  if (org.subscriptionTier && org.subscriptionStatus === "active") {
    return org.subscriptionTier as PlanTier;
  }

  // Trial expired and no subscription
  return "free";
}

// Check if organization can create a new project
export async function checkProjectLimit(
  orgId: string,
  prisma: PrismaClient
): Promise<PlanLimitCheck> {
  // Get organization details
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      subscriptionTier: true,
      subscriptionStatus: true,
      trialEndsAt: true,
    },
  });

  if (!org) {
    return { allowed: false, reason: "Organization not found" };
  }

  const effectiveTier = await getEffectivePlanTier(org);

  // Free tier (expired trial without subscription) - no access
  if (effectiveTier === "free") {
    return {
      allowed: false,
      reason: "Your trial has expired. Please upgrade to continue creating projects.",
    };
  }

  const limits = getPlanLimits(effectiveTier);

  // If unlimited projects, allow
  if (limits.maxProjects === Infinity) {
    return { allowed: true };
  }

  // Count current active projects
  const currentProjectCount = await prisma.project.count({
    where: {
      orgId,
      status: { not: "completed" }, // Only count active/on_hold projects
    },
  });

  if (currentProjectCount >= limits.maxProjects) {
    return {
      allowed: false,
      reason: `You've reached the maximum of ${limits.maxProjects} active projects on the ${effectiveTier === "trial" ? "trial" : effectiveTier} plan. Please upgrade to create more projects.`,
      currentUsage: currentProjectCount,
      limit: limits.maxProjects,
    };
  }

  return { allowed: true };
}

// Check if organization can add a new team member
export async function checkSeatLimit(
  orgId: string,
  prisma: PrismaClient
): Promise<PlanLimitCheck> {
  // Get organization details
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      subscriptionTier: true,
      subscriptionStatus: true,
      trialEndsAt: true,
    },
  });

  if (!org) {
    return { allowed: false, reason: "Organization not found" };
  }

  const effectiveTier = await getEffectivePlanTier(org);

  // Free tier (expired trial without subscription) - no access
  if (effectiveTier === "free") {
    return {
      allowed: false,
      reason: "Your trial has expired. Please upgrade to add team members.",
    };
  }

  const limits = getPlanLimits(effectiveTier);

  // If unlimited seats, allow
  if (limits.maxSeats === Infinity) {
    return { allowed: true };
  }

  // Count current team members
  const currentSeatCount = await prisma.user.count({
    where: { orgId },
  });

  // Also count pending invites
  const pendingInviteCount = await prisma.invite.count({
    where: {
      orgId,
      status: "pending",
      expiresAt: { gt: new Date() },
    },
  });

  const totalSeats = currentSeatCount + pendingInviteCount;

  if (totalSeats >= limits.maxSeats) {
    return {
      allowed: false,
      reason: `You've reached the maximum of ${limits.maxSeats} team members on the ${effectiveTier === "trial" ? "trial" : effectiveTier} plan. Please upgrade to add more members.`,
      currentUsage: totalSeats,
      limit: limits.maxSeats,
    };
  }

  return { allowed: true };
}

// Check if organization is on trial
export async function isOnTrial(
  orgId: string,
  prisma: PrismaClient
): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { trialEndsAt: true },
  });

  if (!org || !org.trialEndsAt) {
    return false;
  }

  return new Date(org.trialEndsAt) > new Date();
}

// Get days remaining in trial
export async function getTrialDaysRemaining(
  orgId: string,
  prisma: PrismaClient
): Promise<number | null> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { trialEndsAt: true },
  });

  if (!org || !org.trialEndsAt) {
    return null;
  }

  const now = new Date();
  const trialEnd = new Date(org.trialEndsAt);

  if (trialEnd <= now) {
    return 0;
  }

  const diffMs = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
}

// Get subscription status summary
export async function getSubscriptionSummary(
  orgId: string,
  prisma: PrismaClient
): Promise<{
  tier: PlanTier | "trial" | "free";
  status: string;
  trialDaysRemaining: number | null;
  subscriptionEndsAt: Date | null;
}> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      subscriptionTier: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      subscriptionEndsAt: true,
    },
  });

  if (!org) {
    return {
      tier: "free",
      status: "none",
      trialDaysRemaining: null,
      subscriptionEndsAt: null,
    };
  }

  const tier = await getEffectivePlanTier(org);
  const trialDaysRemaining = await getTrialDaysRemaining(orgId, prisma);

  return {
    tier,
    status: org.subscriptionStatus ?? "none",
    trialDaysRemaining,
    subscriptionEndsAt: org.subscriptionEndsAt,
  };
}
