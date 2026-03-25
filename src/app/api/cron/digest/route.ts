import { NextRequest, NextResponse } from "next/server";
import { runDailyDigest, wasDigestSentToday } from "@/lib/digest";

export const dynamic = 'force-dynamic';

/**
 * Vercel Cron endpoint for daily digest emails
 * 
 * Scheduled at:
 * - 07:00 UTC: Main run
 * - 07:05 UTC: Retry run (only runs if no digest was sent today)
 * 
 * Security: Validates CRON_SECRET or Vercel's built-in cron auth header
 */
export async function GET(request: NextRequest) {
  // Validate authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  // Check for Vercel's built-in cron authorization or our custom secret
  const isVercelCron = request.headers.get("x-vercel-cron") === "true";
  const isValidSecret = authHeader === `Bearer ${cronSecret}`;
  
  // In development, allow without auth
  const isDevelopment = process.env.NODE_ENV === "development";
  
  if (!isVercelCron && !isValidSecret && !isDevelopment) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Check if this is a retry request
  const url = new URL(request.url);
  const isRetry = url.searchParams.get("retry") === "true";
  
  try {
    // If this is a retry, check if digest was already sent today
    if (isRetry) {
      const alreadySent = await wasDigestSentToday();
      if (alreadySent) {
        return NextResponse.json({
          success: true,
          message: "Digest already sent today, skipping retry",
          skipped: true,
        });
      }
    }

    // Run the daily digest
    const result = await runDailyDigest();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      isRetry,
      stats: {
        totalUsers: result.totalUsers,
        emailsSent: result.emailsSent,
        emailsSkipped: result.emailsSkipped,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
    });
  } catch (error) {
    console.error("Digest cron error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
