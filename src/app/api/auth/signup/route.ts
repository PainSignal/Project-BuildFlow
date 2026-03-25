import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) + "-" + nanoid(6);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, orgName } = body;

    if (!name || !email || !password || !orgName) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const slug = generateSlug(orgName);

    // Create organization and user in a transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Set trial period to 14 days from now
      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      const organization = await tx.organization.create({
        data: {
          name: orgName,
          slug,
          trialEndsAt,
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          orgId: organization.id,
          role: "owner",
          onboardingCompleted: false,
        },
      });

      return { organization, user };
    });

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    
    // Log more specific error information for debugging
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    // Check for Prisma-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      console.error("Prisma error code:", (error as any).code);
    }
    
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
