import { PrismaClient } from "@prisma/client";
import { sendDigestEmail } from "./email";
import type {
  TaskDigestItem,
  PermitDigestItem,
  GroupedTasks,
  GroupedPermits,
  DigestData,
} from "./digest-types";

// Re-export types for convenience
export type {
  TaskDigestItem,
  PermitDigestItem,
  GroupedTasks,
  GroupedPermits,
  DigestData,
};

const prisma = new PrismaClient();

/**
 * Get tasks due within the next 3 days for a user
 * - Tasks where user is assignee
 * - Tasks where user is project manager of the project
 * - Status is not 'done'
 */
export async function getUpcomingTasks(
  userId: string,
  orgId: string
): Promise<TaskDigestItem[]> {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Set to start and end of day for proper comparison
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const tasks = await prisma.task.findMany({
    where: {
      orgId,
      status: { not: "done" },
      dueDate: {
        gte: todayStart,
        lte: threeDaysFromNow,
      },
      OR: [
        // User is assigned to the task
        { assigneeId: userId },
        // User is project manager of the task's project
        {
          project: {
            projectManagerId: userId,
          },
        },
      ],
    },
    include: {
      project: {
        select: { id: true, name: true },
      },
      assignee: {
        select: { id: true, name: true },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  return tasks;
}

/**
 * Get permits with deadline within the next 7 days for a user
 * - Permits where user is project manager of the project
 * - Status is not 'approved' or 'rejected'
 */
export async function getUpcomingPermits(
  userId: string,
  orgId: string
): Promise<PermitDigestItem[]> {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Set to start of today for proper comparison
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const permits = await prisma.permit.findMany({
    where: {
      orgId,
      status: { notIn: ["approved", "rejected"] },
      deadline: {
        gte: todayStart,
        lte: sevenDaysFromNow,
      },
      project: {
        projectManagerId: userId,
      },
    },
    include: {
      project: {
        select: { id: true, name: true },
      },
    },
    orderBy: { deadline: "asc" },
  });

  return permits;
}

/**
 * Group tasks by project
 */
export function groupTasksByProject(tasks: TaskDigestItem[]): GroupedTasks {
  return tasks.reduce<GroupedTasks>((acc, task) => {
    const projectId = task.project.id;
    if (!acc[projectId]) {
      acc[projectId] = {
        projectName: task.project.name,
        projectId,
        tasks: [],
      };
    }
    acc[projectId].tasks.push(task);
    return acc;
  }, {});
}

/**
 * Group permits by project
 */
export function groupPermitsByProject(permits: PermitDigestItem[]): GroupedPermits {
  return permits.reduce<GroupedPermits>((acc, permit) => {
    const projectId = permit.project.id;
    if (!acc[projectId]) {
      acc[projectId] = {
        projectName: permit.project.name,
        projectId,
        permits: [],
      };
    }
    acc[projectId].permits.push(permit);
    return acc;
  }, {});
}

/**
 * Get all users who have digest enabled
 */
export async function getDigestSubscribers() {
  return prisma.user.findMany({
    where: {
      digestEnabled: true,
    },
    include: {
      organization: {
        select: { id: true, name: true },
      },
    },
  });
}

/**
 * Send digest email to a single user
 * Returns true if email was sent, false if no items to send
 */
export async function sendUserDigest(
  userId: string,
  orgId: string,
  userEmail: string,
  userName: string | null,
  orgName: string
): Promise<{ sent: boolean; taskCount: number; permitCount: number; error?: string }> {
  try {
    // Get upcoming items
    const tasks = await getUpcomingTasks(userId, orgId);
    const permits = await getUpcomingPermits(userId, orgId);

    // If no items, don't send email
    if (tasks.length === 0 && permits.length === 0) {
      return { sent: false, taskCount: 0, permitCount: 0 };
    }

    // Group by project
    const groupedTasks = groupTasksByProject(tasks);
    const groupedPermits = groupPermitsByProject(permits);

    // Send the digest email
    await sendDigestEmail({
      to: userEmail,
      userName: userName || "User",
      orgName,
      tasks: groupedTasks,
      permits: groupedPermits,
    });

    // Log to activity_log
    await prisma.activityLog.create({
      data: {
        orgId,
        userId,
        entityType: "digest",
        entityId: userId, // Use userId as entityId for digest logs
        action: "sent",
        changes: {
          taskCount: tasks.length,
          permitCount: permits.length,
          projectCount: Object.keys(groupedTasks).length + Object.keys(groupedPermits).length,
        },
      },
    });

    return { sent: true, taskCount: tasks.length, permitCount: permits.length };
  } catch (error) {
    console.error(`Error sending digest to user ${userId}:`, error);
    return {
      sent: false,
      taskCount: 0,
      permitCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Run the daily digest for all subscribed users
 * This is the main entry point for the cron job
 */
export async function runDailyDigest(): Promise<{
  totalUsers: number;
  emailsSent: number;
  emailsSkipped: number;
  errors: string[];
}> {
  const subscribers = await getDigestSubscribers();
  const errors: string[] = [];
  let emailsSent = 0;
  let emailsSkipped = 0;

  for (const user of subscribers) {
    const result = await sendUserDigest(
      user.id,
      user.orgId,
      user.email,
      user.name,
      user.organization.name
    );

    if (result.sent) {
      emailsSent++;
    } else if (result.error) {
      errors.push(`User ${user.email}: ${result.error}`);
    } else {
      emailsSkipped++;
    }
  }

  return {
    totalUsers: subscribers.length,
    emailsSent,
    emailsSkipped,
    errors,
  };
}

/**
 * Check if digest was already sent today (for retry logic)
 */
export async function wasDigestSentToday(): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const count = await prisma.activityLog.count({
    where: {
      entityType: "digest",
      action: "sent",
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  return count > 0;
}
