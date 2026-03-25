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
      
      // Ensure /tmp directory exists
      if (!fs.existsSync("/tmp")) {
        fs.mkdirSync("/tmp", { recursive: true });
      }
      
      // Apply schema to create tables using prisma db push
      const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
      if (fs.existsSync(schemaPath)) {
        execSync(`npx prisma db push --schema=${schemaPath}`, {
          stdio: "pipe",
          env: { ...process.env, DATABASE_URL: dbUrl }
        });
        console.log("Database schema applied successfully");
      }
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw new Error(`Database initialization failed: ${error}`);
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
