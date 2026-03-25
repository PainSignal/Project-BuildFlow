"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

const FEATURES = {
  solo: [
    "Up to 10 active projects",
    "1 team member",
    "Project management",
    "Task tracking",
    "Purchase orders",
    "Basic reporting",
  ],
  team: [
    "Unlimited projects",
    "Up to 5 team members",
    "Everything in Solo",
    "Team collaboration",
    "Client portal access",
    "Priority support",
  ],
  growth: [
    "Unlimited projects",
    "Up to 15 team members",
    "Everything in Team",
    "Advanced analytics",
    "API access",
    "Dedicated support",
    "Custom integrations",
  ],
};

export default function PricingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");

  const { data: plans } = trpc.billing.getPlans.useQuery();
  const { data: subscriptionStatus } = trpc.billing.getSubscriptionStatus.useQuery(
    undefined,
    { enabled: status === "authenticated" }
  );

  const createCheckout = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      window.location.href = data.checkoutUrl;
    },
    onError: (error) => {
      console.error("Checkout error:", error.message);
    },
  });

  const handleSelectPlan = (tier: string) => {
    if (status !== "authenticated") {
      router.push("/signup");
      return;
    }

    createCheckout.mutate({
      tier: tier as "solo" | "team" | "growth",
      interval: billingInterval,
    });
  };

  const isCurrentPlan = (tier: string) => {
    return subscriptionStatus?.tier === tier;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <h1 className="text-xl font-bold text-blue-600">BuildFlow</h1>
          </Link>
          <div className="flex items-center gap-4">
            {status === "authenticated" ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">
                    Dashboard
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Start your 14-day free trial. No credit card required.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingInterval === "monthly"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("annual")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingInterval === "annual"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Annual
              <span className="ml-2 text-green-600 text-xs font-semibold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans?.map((plan) => (
            <Card
              key={plan.tier}
              className={`relative ${
                plan.tier === "team" ? "border-blue-500 shadow-lg scale-105" : ""
              }`}
            >
              {plan.tier === "team" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>
                  {plan.tier === "solo"
                    ? "For individual contractors"
                    : plan.tier === "team"
                    ? "For small teams"
                    : "For growing businesses"}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-6">
                <div className="mb-4">
                  <span className="text-4xl font-bold">
                    {billingInterval === "monthly"
                      ? plan.monthlyPriceFormatted
                      : plan.annualMonthlyEquivalent}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                {billingInterval === "annual" && (
                  <p className="text-sm text-muted-foreground mb-2">
                    Billed annually ({plan.annualPriceFormatted})
                  </p>
                )}
                <div className="text-sm text-muted-foreground">
                  <span>{plan.maxProjects} projects</span>
                  <span className="mx-2">·</span>
                  <span>{plan.maxSeats} seats</span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button
                  className="w-full"
                  variant={plan.tier === "team" ? "default" : "outline"}
                  onClick={() => handleSelectPlan(plan.tier)}
                  disabled={createCheckout.isPending || isCurrentPlan(plan.tier)}
                >
                  {isCurrentPlan(plan.tier)
                    ? "Current Plan"
                    : status !== "authenticated"
                    ? "Start Free Trial"
                    : createCheckout.isPending
                    ? "Loading..."
                    : "Upgrade"}
                </Button>
                <div className="w-full">
                  <p className="text-xs text-center text-muted-foreground">
                    14-day free trial
                  </p>
                </div>
              </CardFooter>

              {/* Features */}
              <div className="px-6 pb-6">
                <ul className="space-y-2">
                  {FEATURES[plan.tier as keyof typeof FEATURES].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2">What happens after my trial ends?</h4>
              <p className="text-muted-foreground">
                After your 14-day trial, you&apos;ll need to select a plan to continue using BuildFlow.
                You won&apos;t lose any data during the transition.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Can I change plans later?</h4>
              <p className="text-muted-foreground">
                Yes, you can upgrade or downgrade your plan at any time. Changes will be prorated
                based on your billing cycle.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">What payment methods do you accept?</h4>
              <p className="text-muted-foreground">
                We accept all major credit cards and PayPal through our secure payment provider,
                Lemon Squeezy.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Is there a discount for annual billing?</h4>
              <p className="text-muted-foreground">
                Yes! Annual billing saves you 20% compared to monthly billing. That&apos;s like
                getting over 2 months free.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        {status !== "authenticated" && (
          <div className="mt-20 text-center bg-blue-50 rounded-xl p-12">
            <h3 className="text-2xl font-bold mb-4">
              Ready to streamline your construction projects?
            </h3>
            <p className="text-muted-foreground mb-6">
              Join thousands of contractors using BuildFlow to manage their projects efficiently.
            </p>
            <Link href="/signup">
              <Button size="lg">Start Your Free Trial</Button>
            </Link>
          </div>
        )}
      </main>

      <footer className="border-t bg-white mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} BuildFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
