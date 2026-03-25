import { Resend } from "resend";
import { GroupedTasks, GroupedPermits } from "./digest-types";

// Only initialize Resend if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

interface SendInviteEmailParams {
  to: string;
  orgName: string;
  inviterName: string;
  inviteToken: string;
}

export async function sendInviteEmail({
  to,
  orgName,
  inviterName,
  inviteToken,
}: SendInviteEmailParams) {
  const inviteUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/invite/${inviteToken}`;

  // If Resend is not configured, log the invite URL for testing
  if (!resend) {
    console.log(`[DEV] Invite email not sent (RESEND_API_KEY not configured)`);
    console.log(`[DEV] Invite URL: ${inviteUrl}`);
    return { id: "dev-mode", from: "dev", to, createdAt: new Date() };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "BuildFlow <noreply@buildflow.app>",
      to,
      subject: `You've been invited to join ${orgName} on BuildFlow`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; font-size: 24px;">You're invited to join ${orgName}</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            ${inviterName} has invited you to join ${orgName} on BuildFlow, a construction operations platform.
          </p>
          <p style="margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Accept Invitation
            </a>
          </p>
          <p style="color: #999; font-size: 14px;">
            This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px;">
            BuildFlow - Operations tool for construction firms
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      throw new Error("Failed to send invite email");
    }

    return data;
  } catch (error) {
    console.error("Send invite email error:", error);
    throw error;
  }
}

interface SendClientUpdateEmailParams {
  to: string;
  clientName: string;
  projectName: string;
  subject: string;
  message: string;
}

export async function sendClientUpdateEmail({
  to,
  clientName,
  projectName,
  subject,
  message,
}: SendClientUpdateEmailParams) {
  // If Resend is not configured, log for testing
  if (!resend) {
    console.log(`[DEV] Client update email not sent (RESEND_API_KEY not configured)`);
    console.log(`[DEV] To: ${to}, Subject: ${subject}`);
    return { id: "dev-mode", from: "dev", to, createdAt: new Date() };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "BuildFlow <noreply@buildflow.app>",
      to,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; font-size: 24px;">Project Update: ${projectName}</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Dear ${clientName},
          </p>
          <div style="color: #333; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">
            ${message}
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px;">
            BuildFlow - Operations tool for construction firms
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      throw new Error("Failed to send client update email");
    }

    return data;
  } catch (error) {
    console.error("Send client update email error:", error);
    throw error;
  }
}

interface SendDigestEmailParams {
  to: string;
  userName: string;
  orgName: string;
  tasks: GroupedTasks;
  permits: GroupedPermits;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatRelativeDate(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
  return formatDate(date);
}

export async function sendDigestEmail({
  to,
  userName,
  orgName,
  tasks,
  permits,
}: SendDigestEmailParams) {
  const settingsUrl = `${BASE_URL}/settings`;
  
  // Build task sections
  const taskProjects = Object.values(tasks);
  const permitProjects = Object.values(permits);
  
  // Build task HTML
  let tasksHtml = "";
  if (taskProjects.length > 0) {
    tasksHtml = `
      <div style="margin-bottom: 32px;">
        <h2 style="color: #333; font-size: 18px; margin-bottom: 16px; border-bottom: 2px solid #0070f3; padding-bottom: 8px;">
          Tasks Due Soon (Next 3 Days)
        </h2>
        ${taskProjects.map(project => `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #0070f3; font-size: 16px; margin-bottom: 12px;">
              <a href="${BASE_URL}/projects/${project.projectId}" style="color: #0070f3; text-decoration: none;">
                ${project.projectName}
              </a>
            </h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${project.tasks.map(task => `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 8px 0;">
                    <a href="${BASE_URL}/projects/${project.projectId}" style="color: #333; text-decoration: none; font-weight: 500;">
                      ${task.title}
                    </a>
                    ${task.assignee ? `<span style="color: #666; font-size: 13px; margin-left: 8px;">(${task.assignee.name || "Unknown"})</span>` : ""}
                  </td>
                  <td style="padding: 8px 0; text-align: right; color: ${task.dueDate && new Date(task.dueDate) <= new Date() ? "#dc2626" : "#666"}; font-size: 13px;">
                    ${task.dueDate ? formatRelativeDate(new Date(task.dueDate)) : "—"}
                  </td>
                  <td style="padding: 8px 0; text-align: right;">
                    <span style="padding: 2px 8px; border-radius: 4px; font-size: 12px; background: ${
                      task.priority === "high" ? "#fef2f2; color: #dc2626" :
                      task.priority === "low" ? "#f0f9ff; color: #0284c7" :
                      "#f5f5f5; color: #666"
                    };">
                      ${task.priority}
                    </span>
                  </td>
                </tr>
              `).join("")}
            </table>
          </div>
        `).join("")}
      </div>
    `;
  }

  // Build permits HTML
  let permitsHtml = "";
  if (permitProjects.length > 0) {
    permitsHtml = `
      <div style="margin-bottom: 32px;">
        <h2 style="color: #333; font-size: 18px; margin-bottom: 16px; border-bottom: 2px solid #f59e0b; padding-bottom: 8px;">
          Permit Deadlines (Next 7 Days)
        </h2>
        ${permitProjects.map(project => `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #0070f3; font-size: 16px; margin-bottom: 12px;">
              <a href="${BASE_URL}/projects/${project.projectId}" style="color: #0070f3; text-decoration: none;">
                ${project.projectName}
              </a>
            </h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${project.permits.map(permit => `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 8px 0;">
                    <a href="${BASE_URL}/projects/${project.projectId}" style="color: #333; text-decoration: none; font-weight: 500;">
                      ${permit.name}
                    </a>
                    ${permit.permitNumber ? `<span style="color: #666; font-size: 13px; margin-left: 8px;">(#${permit.permitNumber})</span>` : ""}
                  </td>
                  <td style="padding: 8px 0; text-align: right; color: ${new Date(permit.deadline) <= new Date() ? "#dc2626" : "#666"}; font-size: 13px;">
                    ${formatRelativeDate(new Date(permit.deadline))}
                  </td>
                  <td style="padding: 8px 0; text-align: right;">
                    <span style="padding: 2px 8px; border-radius: 4px; font-size: 12px; background: ${
                      permit.status === "pending" ? "#fef3c7; color: #d97706" :
                      permit.status === "submitted" ? "#dbeafe; color: #2563eb" :
                      "#f5f5f5; color: #666"
                    };">
                      ${permit.status}
                    </span>
                  </td>
                </tr>
              `).join("")}
            </table>
          </div>
        `).join("")}
      </div>
    `;
  }

  const totalItems = taskProjects.reduce((sum, p) => sum + p.tasks.length, 0) +
                     permitProjects.reduce((sum, p) => sum + p.permits.length, 0);

  // If Resend is not configured, log for testing
  if (!resend) {
    console.log(`[DEV] Digest email not sent (RESEND_API_KEY not configured)`);
    console.log(`[DEV] To: ${to}, Items: ${totalItems}`);
    return { id: "dev-mode", from: "dev", to, createdAt: new Date() };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "BuildFlow <noreply@buildflow.app>",
      to,
      subject: `Your Daily Digest - ${totalItems} item${totalItems !== 1 ? "s" : ""} needing attention`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0070f3 0%, #0051cc 100%); padding: 24px; text-align: center;">
            <h1 style="color: white; font-size: 24px; margin: 0;">BuildFlow Daily Digest</h1>
            <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 8px 0 0 0;">${orgName}</p>
          </div>
          
          <div style="padding: 24px; background: #fff;">
            <p style="color: #333; font-size: 16px; margin-bottom: 24px;">
              Hi ${userName},
            </p>
            <p style="color: #666; font-size: 14px; margin-bottom: 24px;">
              Here's a summary of items that need your attention:
            </p>
            
            ${tasksHtml}
            ${permitsHtml}
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${BASE_URL}/dashboard" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Dashboard
              </a>
            </div>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 0;" />
          <div style="padding: 24px; background: #f9fafb;">
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              You received this email because you have daily digest enabled for ${orgName}.
              <br />
              <a href="${settingsUrl}" style="color: #0070f3; text-decoration: none;">Manage notification preferences</a>
            </p>
            <p style="color: #999; font-size: 11px; text-align: center; margin: 12px 0 0 0;">
              BuildFlow - Operations tool for construction firms
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      throw new Error("Failed to send digest email");
    }

    return data;
  } catch (error) {
    console.error("Send digest email error:", error);
    throw error;
  }
}
