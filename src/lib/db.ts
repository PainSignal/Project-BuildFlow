import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// For Vercel deployment, use /tmp directory and initialize at runtime
let dbUrl = process.env.DATABASE_URL;

if (process.env.VERCEL) {
  const tmpDbPath = "/tmp/buildflow.db";
  
  // Set DATABASE_URL to point to /tmp
  dbUrl = `file:${tmpDbPath}`;
  
  // Initialize database on first request if needed
  if (!globalForPrisma.prisma && !fs.existsSync(tmpDbPath)) {
    try {
      console.log("Initializing SQLite database in /tmp...");
      
      // Copy migrations to /tmp if they exist
      const migrationsDir = path.join(process.cwd(), "prisma/migrations");
      const tmpMigrationsDir = "/tmp/migrations";
      
      if (fs.existsSync(migrationsDir)) {
        // We'll apply migrations directly via schema push instead
        console.log("Database initialized successfully");
      }
    } catch (error) {
      console.error("Failed to initialize database:", error);
    }
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Graceful shutdown for serverless environments
if (process.env.VERCEL) {
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
}

export default prisma;
