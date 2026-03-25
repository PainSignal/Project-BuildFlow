import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/db";
import { getPlanTierFromVariant } from "@/lib/lemonsqueezy";

export const dynamic = 'force-dynamic';

// Verify Lemon Squeezy webhook signature
function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("LEMONSQUEEZY_WEBHOOK_SECRET not configured");
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(payload).digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(digest, "hex"),
    Buffer.from(signature, "hex")
  );
}

// Extract subscription tier from product name or variant
function getTierFromSubscription(data: {
  attributes: {
    variant_id?: number;
    product_name?: string;
  };
}): string | null {
  // Try to get tier from variant ID first
  const variantId = data.attributes.variant_id?.toString();
  if (variantId) {
    const tier = getPlanTierFromVariant(variantId);
    if (tier) return tier;
  }

  // Fallback: extract from product name
  const productName = data.attributes.product_name?.toLowerCase() || "";
  if (productName.includes("solo")) return "solo";
  if (productName.includes("team")) return "team";
  if (productName.includes("growth")) return "growth";

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("x-signature") || "";

    // Verify webhook signature
    if (!verifySignature(payload, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(payload);
    const eventName = body.meta?.event_name;
    const data = body.data;

    if (!eventName || !data) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Get org_id from custom data
    const orgId = body.meta?.custom_data?.org_id;
    if (!orgId) {
      return NextResponse.json(
        { error: "Missing org_id in webhook payload" },
        { status: 400 }
      );
    }

    const attributes = data.attributes;

    switch (eventName) {
      case "subscription_created": {
        const tier = getTierFromSubscription(data);
        if (!tier) {
          return NextResponse.json(
            { error: "Could not determine subscription tier" },
            { status: 400 }
          );
        }

        await prisma.organization.update({
          where: { id: orgId },
          data: {
            subscriptionTier: tier,
            subscriptionStatus: attributes.status || "active",
            subscriptionId: data.id?.toString() || attributes.first_subscription_item?.subscription_id?.toString(),
            customerId: attributes.customer_id?.toString(),
            subscriptionEndsAt: attributes.ends_at ? new Date(attributes.ends_at) : null,
            // Clear trial when subscription is created
            trialEndsAt: null,
          },
        });

        console.log(`Subscription created for org ${orgId}: ${tier}`);
        break;
      }

      case "subscription_updated": {
        const tier = getTierFromSubscription(data);
        if (!tier) {
          return NextResponse.json(
            { error: "Could not determine subscription tier" },
            { status: 400 }
          );
        }

        await prisma.organization.update({
          where: { id: orgId },
          data: {
            subscriptionTier: tier,
            subscriptionStatus: attributes.status || "active",
            subscriptionEndsAt: attributes.ends_at ? new Date(attributes.ends_at) : null,
          },
        });

        console.log(`Subscription updated for org ${orgId}: ${tier} (${attributes.status})`);
        break;
      }

      case "subscription_cancelled": {
        await prisma.organization.update({
          where: { id: orgId },
          data: {
            subscriptionStatus: "cancelled",
            subscriptionEndsAt: attributes.ends_at ? new Date(attributes.ends_at) : null,
          },
        });

        console.log(`Subscription cancelled for org ${orgId}`);
        break;
      }

      case "subscription_expired": {
        await prisma.organization.update({
          where: { id: orgId },
          data: {
            subscriptionStatus: "expired",
            subscriptionTier: null,
            subscriptionId: null,
          },
        });

        console.log(`Subscription expired for org ${orgId}`);
        break;
      }

      case "subscription_resumed": {
        const tier = getTierFromSubscription(data);
        if (!tier) {
          return NextResponse.json(
            { error: "Could not determine subscription tier" },
            { status: 400 }
          );
        }

        await prisma.organization.update({
          where: { id: orgId },
          data: {
            subscriptionTier: tier,
            subscriptionStatus: "active",
            subscriptionEndsAt: attributes.ends_at ? new Date(attributes.ends_at) : null,
          },
        });

        console.log(`Subscription resumed for org ${orgId}`);
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${eventName}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
