import { PrismaClient } from "@prisma/client";
import fs from "fs";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// For Vercel deployment, use /tmp directory
let dbUrl = process.env.DATABASE_URL;

if (process.env.VERCEL) {
  const tmpDbPath = "/tmp/buildflow.db";
  const buildDbPath = "./dev.db"; // Database created at build time
  
  // Set DATABASE_URL to point to /tmp
  dbUrl = `file:${tmpDbPath}`;
  
  // Ensure /tmp directory exists
  if (!fs.existsSync("/tmp")) {
    fs.mkdirSync("/tmp", { recursive: true });
  }
  
  // Copy database from build to /tmp if it doesn't exist
  // This preserves the schema created during build
  if (!fs.existsSync(tmpDbPath) && fs.existsSync(buildDbPath)) {
    fs.copyFileSync(buildDbPath, tmpDbPath);
    console.log("Database copied to /tmp");
  } else if (!fs.existsSync(tmpDbPath)) {
    // Create empty database file - schema will be applied on first query
    fs.writeFileSync(tmpDbPath, "");
    console.log("Empty database file created in /tmp");
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
