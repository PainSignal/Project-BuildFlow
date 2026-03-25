"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string;
  currentUsage?: number;
  limit?: number;
  type?: "projects" | "seats";
}

export function UpgradePrompt({
  open,
  onOpenChange,
  reason,
  currentUsage,
  limit,
  type = "projects",
}: UpgradePromptProps) {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const { data: subscriptionStatus } = trpc.billing.getSubscriptionStatus.useQuery();

  const handleUpgrade = () => {
    setIsRedirecting(true);
    router.push("/pricing");
  };

  const isOnTrial = subscriptionStatus?.tier === "trial";
  const trialDaysRemaining = subscriptionStatus?.trialDaysRemaining;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-blue-500" />
            Upgrade Required
          </DialogTitle>
          <DialogDescription>
            {reason || `You've reached the limit for your current plan.`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {currentUsage !== undefined && limit !== undefined && (
            <div className="bg-gray-100 rounded-lg p-4 mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Current usage</span>
                <span className="font-medium">
                  {currentUsage} / {limit} {type}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all"
                  style={{ width: `${Math.min((currentUsage / limit) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          {isOnTrial && trialDaysRemaining !== null && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Free Trial:</strong> You have {trialDaysRemaining} days remaining.
                Upgrade now to continue after your trial ends.
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Upgrade to a higher tier plan to unlock more {type} and additional features.
          </p>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button onClick={handleUpgrade} disabled={isRedirecting}>
            {isRedirecting ? "Loading..." : "View Plans"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Compact inline upgrade prompt for embedding in pages
interface InlineUpgradePromptProps {
  type: "projects" | "seats";
  currentUsage: number;
  limit: number;
}

export function InlineUpgradePrompt({ type, currentUsage, limit }: InlineUpgradePromptProps) {
  const router = useRouter();

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-amber-100 rounded-full p-2">
          <ArrowUpRight className="h-4 w-4 text-amber-600" />
        </div>
        <div>
          <p className="font-medium text-amber-900">
            {type === "projects" ? "Project limit reached" : "Team limit reached"}
          </p>
          <p className="text-sm text-amber-700">
            Using {currentUsage} of {limit} {type}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="border-amber-300 text-amber-700 hover:bg-amber-100"
        onClick={() => router.push("/pricing")}
      >
        Upgrade
      </Button>
    </div>
  );
}

// Trial banner component
export function TrialBanner() {
  const { data: subscriptionStatus } = trpc.billing.getSubscriptionStatus.useQuery();
  const router = useRouter();

  if (!subscriptionStatus || subscriptionStatus.tier !== "trial") {
    return null;
  }

  const daysRemaining = subscriptionStatus.trialDaysRemaining ?? 0;

  if (daysRemaining <= 0) {
    return (
      <div className="bg-red-500 text-white px-4 py-2 text-center text-sm">
        <strong>Trial expired.</strong>{" "}
        <button
          onClick={() => router.push("/pricing")}
          className="underline font-medium"
        >
          Upgrade now
        </button>{" "}
        to continue using BuildFlow.
      </div>
    );
  }

  if (daysRemaining <= 3) {
    return (
      <div className="bg-orange-500 text-white px-4 py-2 text-center text-sm">
        <strong>Trial ending soon!</strong> Only {daysRemaining} days remaining.{" "}
        <button
          onClick={() => router.push("/pricing")}
          className="underline font-medium"
        >
          Choose a plan
        </button>
      </div>
    );
  }

  return (
    <div className="bg-blue-500 text-white px-4 py-2 text-center text-sm">
      <strong>{daysRemaining} days</strong> left in your free trial.{" "}
      <button
        onClick={() => router.push("/pricing")}
        className="underline font-medium"
      >
        Explore plans
      </button>
    </div>
  );
}
