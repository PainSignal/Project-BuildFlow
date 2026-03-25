import { router, publicProcedure, protectedProcedure, orgProcedure } from "../trpc";
import { z } from "zod";
import { randomBytes } from "crypto";
import { sendInviteEmail } from "@/lib/email";
import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { checkProjectLimit, checkSeatLimit, getSubscriptionSummary } from "@/lib/plan-limits";
import { PLANS, createCheckoutSession, formatPrice, type PlanTier, type BillingInterval } from "@/lib/lemonsqueezy";

export const authRouter = router({
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),
  
  getProfile: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      include: { organization: true },
    });
  }),
});

export const orgRouter = router({
  getCurrent: orgProcedure.query(({ ctx }) => {
    return ctx.prisma.organization.findUnique({
      where: { id: ctx.orgId },
    });
  }),

  update: orgProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.organization.update({
        where: { id: ctx.orgId },
        data: input,
      });
    }),

  getMembers: orgProcedure.query(({ ctx }) => {
    return ctx.prisma.user.findMany({
      where: { orgId: ctx.orgId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }),

  updateMemberRole: orgProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["owner", "admin", "member"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const targetUser = await ctx.prisma.user.findFirst({
        where: { id: input.userId, orgId: ctx.orgId },
      });

      if (!targetUser) {
        throw new Error("User not found in this organization");
      }

      // Prevent removing the last owner
      if (targetUser.role === "owner" && input.role !== "owner") {
        const ownerCount = await ctx.prisma.user.count({
          where: { orgId: ctx.orgId, role: "owner" },
        });
        if (ownerCount <= 1) {
          throw new Error("Cannot remove the last owner");
        }
      }

      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: { role: input.role },
      });
    }),

  removeMember: orgProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const targetUser = await ctx.prisma.user.findFirst({
        where: { id: input.userId, orgId: ctx.orgId },
      });

      if (!targetUser) {
        throw new Error("User not found in this organization");
      }

      // Prevent removing the last owner
      if (targetUser.role === "owner") {
        const ownerCount = await ctx.prisma.user.count({
          where: { orgId: ctx.orgId, role: "owner" },
        });
        if (ownerCount <= 1) {
          throw new Error("Cannot remove the last owner");
        }
      }

      // Prevent self-removal
      if (targetUser.id === ctx.session.user.id) {
        throw new Error("Cannot remove yourself from the organization");
      }

      return ctx.prisma.user.delete({
        where: { id: input.userId },
      });
    }),
});

export const projectRouter = router({
  list: orgProcedure
    .input(
      z.object({
        status: z.enum(["active", "on_hold", "completed"]).optional(),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.project.findMany({
        where: {
          orgId: ctx.orgId,
          ...(input.status && { status: input.status }),
        },
        include: {
          client: true,
          projectManager: { select: { id: true, name: true, email: true } },
          tasks: {
            select: {
              id: true,
              status: true,
            },
          },
          _count: {
            select: { tasks: true, permits: true, purchaseOrders: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.project.findFirst({
        where: { id: input.id, orgId: ctx.orgId },
        include: {
          client: true,
          projectManager: { select: { id: true, name: true, email: true } },
          tasks: {
            include: { assignee: { select: { id: true, name: true, email: true } } },
            orderBy: { dueDate: "asc" },
          },
          permits: { orderBy: { deadline: "asc" } },
          purchaseOrders: {
            include: { lineItems: true },
            orderBy: { orderDate: "desc" },
          },
        },
      });
    }),

  create: orgProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        clientId: z.string().optional(),
        startDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
        endDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
        budget: z.number().optional(),
        projectManagerId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check plan limits before creating project
      const limitCheck = await checkProjectLimit(ctx.orgId, ctx.prisma);
      if (!limitCheck.allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: limitCheck.reason || "Plan limit exceeded",
        });
      }

      const project = await ctx.prisma.project.create({
        data: {
          orgId: ctx.orgId,
          name: input.name,
          description: input.description,
          clientId: input.clientId,
          startDate: input.startDate,
          endDate: input.endDate,
          budget: input.budget,
          projectManagerId: input.projectManagerId,
        },
      });

      // Auto-seed default tasks
      const defaultTasks = [
        { title: "Submit permit application", taskType: "permit" },
        { title: "Order materials", taskType: "material" },
        { title: "Client kickoff call", taskType: "client" },
      ];

      await ctx.prisma.task.createMany({
        data: defaultTasks.map((task) => ({
          orgId: ctx.orgId,
          projectId: project.id,
          title: task.title,
          taskType: task.taskType,
        })),
      });

      await ctx.prisma.activityLog.create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.session.user.id,
          entityType: "project",
          entityId: project.id,
          action: "create",
          changes: { after: project },
        },
      });

      return project;
    }),

  update: orgProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        status: z.enum(["active", "on_hold", "completed"]).optional(),
        clientId: z.string().nullable().optional(),
        startDate: z.string().datetime().nullable().optional().transform(val => {
          if (!val || val === "") return undefined;
          return new Date(val);
        }),
        endDate: z.string().datetime().nullable().optional().transform(val => {
          if (!val || val === "") return undefined;
          return new Date(val);
        }),
        budget: z.number().nullable().optional(),
        projectManagerId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const before = await ctx.prisma.project.findFirst({
        where: { id, orgId: ctx.orgId },
      });

      if (!before) {
        throw new Error("Project not found");
      }

      const project = await ctx.prisma.project.update({
        where: { id },
        data,
      });

      await ctx.prisma.activityLog.create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.session.user.id,
          entityType: "project",
          entityId: project.id,
          action: "update",
          changes: { before, after: project },
        },
      });

      return project;
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.id, orgId: ctx.orgId },
      });

      if (!project) {
        throw new Error("Project not found");
      }

      await ctx.prisma.project.delete({
        where: { id: input.id },
      });

      await ctx.prisma.activityLog.create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.session.user.id,
          entityType: "project",
          entityId: input.id,
          action: "delete",
          changes: { before: project },
        },
      });

      return { success: true };
    }),
});

export const taskRouter = router({
  list: orgProcedure
    .input(z.object({ projectId: z.string().optional() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.task.findMany({
        where: {
          orgId: ctx.orgId,
          ...(input.projectId && { projectId: input.projectId }),
        },
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
        orderBy: { dueDate: "asc" },
      });
    }),

  create: orgProcedure
    .input(
      z.object({
        projectId: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        assigneeId: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        taskType: z.enum(["general", "permit", "material", "client"]).optional(),
        blocked: z.boolean().optional(),
        dueDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.create({
        data: {
          orgId: ctx.orgId,
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          assigneeId: input.assigneeId,
          priority: input.priority ?? "medium",
          taskType: input.taskType ?? "general",
          blocked: input.blocked ?? false,
          dueDate: input.dueDate,
        },
        include: {
          assignee: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      });

      // Create notification if task is assigned
      if (input.assigneeId) {
        await ctx.prisma.notification.create({
          data: {
            orgId: ctx.orgId,
            userId: input.assigneeId,
            type: "task_assigned",
            title: "New task assigned",
            message: `You have been assigned to "${input.title}" in project "${task.project.name}"`,
            entityType: "task",
            entityId: task.id,
          },
        });
      }

      await ctx.prisma.activityLog.create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.session.user.id,
          entityType: "task",
          entityId: task.id,
          action: "create",
          changes: { after: task },
        },
      });

      return task;
    }),

  update: orgProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        status: z.enum(["todo", "in_progress", "done"]).optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        taskType: z.enum(["general", "permit", "material", "client"]).optional(),
        blocked: z.boolean().optional(),
        assigneeId: z.string().nullable().optional(),
        dueDate: z.date().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const before = await ctx.prisma.task.findFirst({
        where: { id, orgId: ctx.orgId },
        include: { assignee: { select: { id: true } } },
      });

      if (!before) {
        throw new Error("Task not found");
      }

      const task = await ctx.prisma.task.update({
        where: { id },
        data,
        include: {
          assignee: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      });

      // Create notification if assignee changed
      if (input.assigneeId && input.assigneeId !== before.assigneeId) {
        await ctx.prisma.notification.create({
          data: {
            orgId: ctx.orgId,
            userId: input.assigneeId,
            type: "task_assigned",
            title: "New task assigned",
            message: `You have been assigned to "${task.title}" in project "${task.project.name}"`,
            entityType: "task",
            entityId: task.id,
          },
        });
      }

      await ctx.prisma.activityLog.create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.session.user.id,
          entityType: "task",
          entityId: task.id,
          action: "update",
          changes: { before, after: task },
        },
      });

      return task;
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findFirst({
        where: { id: input.id, orgId: ctx.orgId },
      });

      if (!task) {
        throw new Error("Task not found");
      }

      await ctx.prisma.task.delete({
        where: { id: input.id },
      });

      await ctx.prisma.activityLog.create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.session.user.id,
          entityType: "task",
          entityId: input.id,
          action: "delete",
          changes: { before: task },
        },
      });

      return { success: true };
    }),
});

// Valid permit status transitions
const VALID_PERMIT_TRANSITIONS: Record<string, string[]> = {
  pending: ["submitted"],
  submitted: ["approved", "rejected"],
  approved: [],
  rejected: ["pending", "submitted"],
};

export const permitRouter = router({
  list: orgProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.permit.findMany({
        where: {
          orgId: ctx.orgId,
          ...(input.projectId && { projectId: input.projectId }),
        },
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: { deadline: "asc" },
      });
    }),

  getById: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.permit.findFirst({
        where: { id: input.id, orgId: ctx.orgId },
        include: {
          project: { select: { id: true, name: true } },
        },
      });
    }),

  create: orgProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1),
        permitNumber: z.string().optional(),
        deadline: z.string().datetime().transform(val => new Date(val)),
        notes: z.string().optional(),
        fileUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const permit = await ctx.prisma.permit.create({
        data: {
          orgId: ctx.orgId,
          projectId: input.projectId,
          name: input.name,
          permitNumber: input.permitNumber,
          deadline: input.deadline,
          notes: input.notes,
          fileUrl: input.fileUrl,
        },
      });

      await ctx.prisma.activityLog.create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.session.user.id,
          entityType: "permit",
          entityId: permit.id,
          action: "create",
          changes: { after: permit },
        },
      });

      return permit;
    }),

  update: orgProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        permitNumber: z.string().optional(),
        status: z.enum(["pending", "submitted", "approved", "rejected"]).optional(),
        deadline: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
        notes: z.string().optional(),
        fileUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const before = await ctx.prisma.permit.findFirst({
        where: { id, orgId: ctx.orgId },
      });

      if (!before) {
        throw new Error("Permit not found");
      }

      // Validate status transition
      if (data.status && data.status !== before.status) {
        const allowedTransitions = VALID_PERMIT_TRANSITIONS[before.status] || [];
        if (!allowedTransitions.includes(data.status)) {
          throw new Error(
            `Invalid status transition from ${before.status} to ${data.status}. Allowed: ${allowedTransitions.join(", ") || "none"}`
          );
        }
      }

      const permit = await ctx.prisma.permit.update({
        where: { id },
        data,
      });

      await ctx.prisma.activityLog.create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.session.user.id,
          entityType: "permit",
          entityId: permit.id,
          action: "update",
          changes: { before, after: permit },
        },
      });

      return permit;
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const permit = await ctx.prisma.permit.findFirst({
        where: { id: input.id, orgId: ctx.orgId },
      });

      if (!permit) {
        throw new Error("Permit not found");
      }

      await ctx.prisma.permit.delete({
        where: { id: input.id },
      });

      await ctx.prisma.activityLog.create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.session.user.id,
          entityType: "permit",
          entityId: input.id,
          action: "delete",
          changes: { before: permit },
        },
      });

      return { success: true };
    }),
});

// Valid purchase order status transitions
const VALID_PO_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent", "cancelled"],
  sent: ["confirmed", "cancelled"],
  confirmed: ["delivered", "cancelled"],
  delivered: [],
  cancelled: ["draft"],
};

export const purchaseOrderRouter = router({
  list: orgProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        status: z.enum(["draft", "sent", "confirmed", "delivered", "cancelled"]).optional(),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.purchaseOrder.findMany({
        where: {
          orgId: ctx.orgId,
          ...(input.projectId && { projectId: input.projectId }),
          ...(input.status && { status: input.status }),
        },
        include: {
          project: { select: { id: true, name: true } },
          lineItems: true,
        },
        orderBy: { orderDate: "desc" },
      });
    }),

  getById: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.purchaseOrder.findFirst({
        where: { id: input.id, orgId: ctx.orgId },
        include: {
          project: { select: { id: true, name: true } },
          lineItems: true,
        },
      });
    }),

  create: orgProcedure
    .input(
      z.object({
        projectId: z.string(),
        vendor: z.string().min(1),
        vatRate: z.number(),
        lineItems: z.array(
          z.object({
            description: z.string(),
            quantity: z.number().int().positive(),
            unitPrice: z.number().positive(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const lineItemsData = input.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
      }));

      const totalAmount = lineItemsData.reduce(
        (sum, item) => sum + item.totalPrice,
        0
      );
      const vatAmount = totalAmount * (input.vatRate / 100);

      const order = await ctx.prisma.purchaseOrder.create({
        data: {
          orgId: ctx.orgId,
          projectId: input.projectId,
          vendor: input.vendor,
          vatRate: input.vatRate,
          totalAmount,
          vatAmount,
          lineItems: {
            create: lineItemsData,
          },
        },
        include: { lineItems: true },
      });

      await ctx.prisma.activityLog.create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.session.user.id,
          entityType: "purchase_order",
          entityId: order.id,
          action: "create",
          changes: { after: order },
        },
      });

      return order;
    }),

  update: orgProcedure
    .input(
      z.object({
        id: z.string(),
        vendor: z.string().min(1).optional(),
        status: z.enum(["draft", "sent", "confirmed", "delivered", "cancelled"]).optional(),
        vatRate: z.number().optional(),
        lineItems: z.array(
          z.object({
            id: z.string().optional(),
            description: z.string(),
            quantity: z.number().int().positive(),
            unitPrice: z.number().positive(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, lineItems, ...data } = input;
      const before = await ctx.prisma.purchaseOrder.findFirst({
        where: { id, orgId: ctx.orgId },
        include: { lineItems: true },
      });

      if (!before) {
        throw new Error("Purchase order not found");
      }

      // Validate status transition
      if (data.status && data.status !== before.status) {
        const allowedTransitions = VALID_PO_TRANSITIONS[before.status] || [];
        if (!allowedTransitions.includes(data.status)) {
          throw new Error(
            `Invalid status transition from ${before.status} to ${data.status}. Allowed: ${allowedTransitions.join(", ") || "none"}`
          );
        }
      }

      // Calculate totals if line items provided
      let totalAmount = Number(before.totalAmount);
      let vatAmount = Number(before.vatAmount);

      if (lineItems) {
        const lineItemsData = lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
        }));

        totalAmount = lineItemsData.reduce((sum, item) => sum + item.totalPrice, 0);
        vatAmount = totalAmount * (input.vatRate ?? Number(before.vatRate)) / 100;

        // Delete existing line items and create new ones
        await ctx.prisma.lineItem.deleteMany({
          where: { purchaseOrderId: id },
        });

        await ctx.prisma.lineItem.createMany({
          data: lineItemsData.map((item) => ({
            purchaseOrderId: id,
            ...item,
          })),
        });
      } else if (input.vatRate !== undefined) {
        vatAmount = totalAmount * (input.vatRate / 100);
      }

      const order = await ctx.prisma.purchaseOrder.update({
        where: { id },
        data: {
          ...data,
          totalAmount,
          vatAmount,
        },
        include: { lineItems: true },
      });

      // If status changed to delivered, auto-complete material tasks
      if (data.status === "delivered" && before.status !== "delivered") {
        const materialTasks = await ctx.prisma.task.findMany({
          where: {
            projectId: before.projectId,
            taskType: "material",
            status: { not: "done" },
          },
        });

        if (materialTasks.length > 0) {
          await ctx.prisma.task.updateMany({
            where: {
              id: { in: materialTasks.map((t: { id: string }) => t.id) },
            },
            data: { status: "done" },
          });

          // Log each task completion
          for (const task of materialTasks) {
            await ctx.prisma.activityLog.create({
              data: {
                orgId: ctx.orgId,
                userId: ctx.session.user.id,
                entityType: "task",
                entityId: task.id,
                action: "auto_complete",
                changes: { reason: `PO ${order.vendor} delivered`, purchaseOrderId: id },
              },
            });
          }
        }
      }

      await ctx.prisma.activityLog.create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.session.user.id,
          entityType: "purchase_order",
          entityId: order.id,
          action: "update",
          changes: { before, after: order },
        },
      });

      return order;
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.purchaseOrder.findFirst({
        where: { id: input.id, orgId: ctx.orgId },
      });

      if (!order) {
        throw new Error("Purchase order not found");
      }

      await ctx.prisma.purchaseOrder.delete({
        where: { id: input.id },
      });

      await ctx.prisma.activityLog.create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.session.user.id,
          entityType: "purchase_order",
          entityId: input.id,
          action: "delete",
          changes: { before: order },
        },
      });

      return { success: true };
    }),

  addLineItem: orgProcedure
    .input(
      z.object({
        purchaseOrderId: z.string(),
        description: z.string().min(1),
        quantity: z.number().int().positive(),
        unitPrice: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.purchaseOrder.findFirst({
        where: { id: input.purchaseOrderId, orgId: ctx.orgId },
      });

      if (!order) {
        throw new Error("Purchase order not found");
      }

      const totalPrice = input.quantity * input.unitPrice;

      const lineItem = await ctx.prisma.lineItem.create({
        data: {
          purchaseOrderId: input.purchaseOrderId,
          description: input.description,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          totalPrice,
        },
      });

      // Update totals
      const newTotal = Number(order.totalAmount) + totalPrice;
      const newVat = newTotal * Number(order.vatRate) / 100;

      await ctx.prisma.purchaseOrder.update({
        where: { id: input.purchaseOrderId },
        data: { totalAmount: newTotal, vatAmount: newVat },
      });

      return lineItem;
    }),

  updateLineItem: orgProcedure
    .input(
      z.object({
        id: z.string(),
        description: z.string().min(1).optional(),
        quantity: z.number().int().positive().optional(),
        unitPrice: z.number().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const lineItem = await ctx.prisma.lineItem.findUnique({
        where: { id: input.id },
        include: { purchaseOrder: true },
      });

      if (!lineItem || lineItem.purchaseOrder.orgId !== ctx.orgId) {
        throw new Error("Line item not found");
      }

      const newQuantity = input.quantity ?? lineItem.quantity;
      const newUnitPrice = input.unitPrice ?? Number(lineItem.unitPrice);
      const newTotalPrice = newQuantity * newUnitPrice;

      const updated = await ctx.prisma.lineItem.update({
        where: { id: input.id },
        data: {
          description: input.description,
          quantity: newQuantity,
          unitPrice: newUnitPrice,
          totalPrice: newTotalPrice,
        },
      });

      // Recalculate order totals
      const allItems = await ctx.prisma.lineItem.findMany({
        where: { purchaseOrderId: lineItem.purchaseOrderId },
      });
      const newOrderTotal = allItems.reduce((sum: number, item: { totalPrice: { toNumber: () => number } | number }) => sum + Number(item.totalPrice), 0);
      const newVat = newOrderTotal * Number(lineItem.purchaseOrder.vatRate) / 100;

      await ctx.prisma.purchaseOrder.update({
        where: { id: lineItem.purchaseOrderId },
        data: { totalAmount: newOrderTotal, vatAmount: newVat },
      });

      return updated;
    }),

  deleteLineItem: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const lineItem = await ctx.prisma.lineItem.findUnique({
        where: { id: input.id },
        include: { purchaseOrder: true },
      });

      if (!lineItem || lineItem.purchaseOrder.orgId !== ctx.orgId) {
        throw new Error("Line item not found");
      }

      await ctx.prisma.lineItem.delete({
        where: { id: input.id },
      });

      // Recalculate order totals
      const remainingItems = await ctx.prisma.lineItem.findMany({
        where: { purchaseOrderId: lineItem.purchaseOrderId },
      });
      const newTotal = remainingItems.reduce((sum: number, item: { totalPrice: { toNumber: () => number } | number }) => sum + Number(item.totalPrice), 0);
      const newVat = newTotal * Number(lineItem.purchaseOrder.vatRate) / 100;

      await ctx.prisma.purchaseOrder.update({
        where: { id: lineItem.purchaseOrderId },
        data: { totalAmount: newTotal, vatAmount: newVat },
      });

      return { success: true };
    }),
});

export const clientRouter = router({
  list: orgProcedure
    .input(
      z.object({
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.client.findMany({
        where: {
          orgId: ctx.orgId,
          ...(input.search && {
            OR: [
              { name: { contains: input.search } },
              { email: { contains: input.search } },
              { phone: { contains: input.search } },
            ],
          }),
        },
        include: {
          projects: {
            select: { id: true, name: true, status: true },
          },
          _count: {
            select: { projects: true },
          },
        },
        orderBy: { name: "asc" },
      });
    }),

  getById: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const client = await ctx.prisma.client.findFirst({
        where: { id: input.id, orgId: ctx.orgId },
        include: {
          projects: {
            select: {
              id: true,
              name: true,
              status: true,
              startDate: true,
              endDate: true,
            },
            orderBy: { createdAt: "desc" },
          },
          clientNotes: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!client) {
        return null;
      }

      // Get last activity date
      const lastActivity = await ctx.prisma.activityLog.findFirst({
        where: {
          orgId: ctx.orgId,
          entityType: "client",
          entityId: input.id,
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });

      return {
        ...client,
        lastActivityAt: lastActivity?.createdAt || null,
      };
    }),

  create: orgProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        address: z.string().optional(),
        vatNumber: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = await ctx.prisma.client.create({
        data: {
          orgId: ctx.orgId,
          name: input.name,
          email: input.email || null,
          phone: input.phone,
          address: input.address,
          vatNumber: input.vatNumber,
          notes: input.notes,
        },
      });

      await ctx.prisma.activityLog.create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.session.user.id,
          entityType: "client",
          entityId: client.id,
          action: "create",
          changes: { after: client },
        },
      });

      return client;
    }),

  update: orgProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional().or(z.literal("")).optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        vatNumber: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const before = await ctx.prisma.client.findFirst({
        where: { id, orgId: ctx.orgId },
      });

      if (!before) {
        throw new Error("Client not found");
      }

      const client = await ctx.prisma.client.update({
        where: { id },
        data: {
          ...data,
          email: data.email || null,
        },
      });

      await ctx.prisma.activityLog.create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.session.user.id,
          entityType: "client",
          entityId: client.id,
          action: "update",
          changes: { before, after: client },
        },
      });

      return client;
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const client = await ctx.prisma.client.findFirst({
        where: { id: input.id, orgId: ctx.orgId },
      });

      if (!client) {
        throw new Error("Client not found");
      }

      await ctx.prisma.client.delete({
        where: { id: input.id },
      });

      await ctx.prisma.activityLog.create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.session.user.id,
          entityType: "client",
          entityId: input.id,
          action: "delete",
          changes: { before: client },
        },
      });

      return { success: true };
    }),

  addNote: orgProcedure
    .input(
      z.object({
        clientId: z.string(),
        type: z.enum(["note", "call", "email"]),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.prisma.clientNote.create({
        data: {
          clientId: input.clientId,
          orgId: ctx.orgId,
          userId: ctx.session.user.id,
          type: input.type,
          content: input.content,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      await ctx.prisma.activityLog.create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.session.user.id,
          entityType: "client",
          entityId: input.clientId,
          action: "note_added",
          changes: { after: note },
        },
      });

      return note;
    }),

  sendUpdate: orgProcedure
    .input(
      z.object({
        clientId: z.string(),
        projectId: z.string(),
        subject: z.string().min(1),
        message: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = await ctx.prisma.client.findFirst({
        where: { id: input.clientId, orgId: ctx.orgId },
      });

      if (!client || !client.email) {
        throw new Error("Client not found or has no email address");
      }

      const project = await ctx.prisma.project.findFirst({
        where: { id: input.projectId, orgId: ctx.orgId },
      });

      if (!project) {
        throw new Error("Project not found");
      }

      // Send email via Resend
      const { sendClientUpdateEmail } = await import("@/lib/email");
      await sendClientUpdateEmail({
        to: client.email,
        clientName: client.name,
        projectName: project.name,
        subject: input.subject,
        message: input.message,
      });

      // Log the email as a client note
      const note = await ctx.prisma.clientNote.create({
        data: {
          clientId: input.clientId,
          orgId: ctx.orgId,
          userId: ctx.session.user.id,
          type: "email",
          content: `Subject: ${input.subject}\n\n${input.message}`,
        },
      });

      await ctx.prisma.activityLog.create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.session.user.id,
          entityType: "client",
          entityId: input.clientId,
          action: "email_sent",
          changes: { after: { subject: input.subject, projectId: input.projectId } },
        },
      });

      return { success: true, note };
    }),
});

export const activityLogRouter = router({
  list: orgProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional(),
        entityType: z.string().optional(),
        entityId: z.string().optional(),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.activityLog.findMany({
        where: {
          orgId: ctx.orgId,
          ...(input.entityType && { entityType: input.entityType }),
          ...(input.entityId && { entityId: input.entityId }),
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit ?? 50,
      });
    }),
});

export const inviteRouter = router({
  list: orgProcedure.query(({ ctx }) => {
    return ctx.prisma.invite.findMany({
      where: { orgId: ctx.orgId },
      include: {
        invitedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  create: orgProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(["admin", "member"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check seat limits before inviting
      const seatCheck = await checkSeatLimit(ctx.orgId, ctx.prisma);
      if (!seatCheck.allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: seatCheck.reason || "Seat limit exceeded",
        });
      }

      // Check if user already exists
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new Error("A user with this email already exists");
      }

      // Check for pending invite
      const existingInvite = await ctx.prisma.invite.findFirst({
        where: {
          email: input.email,
          orgId: ctx.orgId,
          status: "pending",
          expiresAt: { gt: new Date() },
        },
      });

      if (existingInvite) {
        throw new Error("An invite has already been sent to this email");
      }

      // Generate token
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const org = await ctx.prisma.organization.findUnique({
        where: { id: ctx.orgId },
      });

      if (!org) {
        throw new Error("Organization not found");
      }

      const invite = await ctx.prisma.invite.create({
        data: {
          orgId: ctx.orgId,
          email: input.email,
          token,
          role: input.role ?? "member",
          expiresAt,
          invitedById: ctx.session.user.id,
        },
      });

      // Send email (non-blocking in development)
      try {
        await sendInviteEmail({
          to: input.email,
          orgName: org.name,
          inviterName: ctx.session.user.name || "A team member",
          inviteToken: token,
        });
      } catch (error) {
        console.error("Failed to send invite email:", error);
        // In development, we might not have email configured
        // Log the invite URL for testing
        if (process.env.NODE_ENV === "development") {
          console.log(`Invite URL: ${process.env.NEXTAUTH_URL}/invite/${token}`);
        }
      }

      return invite;
    }),

  revoke: orgProcedure
    .input(z.object({ inviteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.prisma.invite.findFirst({
        where: { id: input.inviteId, orgId: ctx.orgId },
      });

      if (!invite) {
        throw new Error("Invite not found");
      }

      return ctx.prisma.invite.update({
        where: { id: input.inviteId },
        data: { status: "revoked" },
      });
    }),

  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const invite = await ctx.prisma.invite.findUnique({
        where: { token: input.token },
        include: {
          organization: { select: { id: true, name: true } },
        },
      });

      if (!invite) {
        throw new Error("Invalid invite token");
      }

      if (invite.status !== "pending") {
        throw new Error("This invite has already been used");
      }

      if (invite.expiresAt < new Date()) {
        throw new Error("This invite has expired");
      }

      return invite;
    }),

  accept: publicProcedure
    .input(
      z.object({
        token: z.string(),
        name: z.string().min(1),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.prisma.invite.findUnique({
        where: { token: input.token },
        include: { organization: true },
      });

      if (!invite || invite.status !== "pending") {
        throw new Error("Invalid or expired invite");
      }

      if (invite.expiresAt < new Date()) {
        throw new Error("This invite has expired");
      }

      // Check if email already registered
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email: invite.email },
      });

      if (existingUser) {
        throw new Error("A user with this email already exists");
      }

      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(input.password, 12);

      // Create user and update invite in transaction
      const result = await ctx.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const user = await tx.user.create({
          data: {
            email: invite.email,
            name: input.name,
            passwordHash,
            orgId: invite.orgId,
            role: invite.role,
            onboardingCompleted: false,
          },
        });

        await tx.invite.update({
          where: { id: invite.id },
          data: {
            status: "accepted",
            acceptedById: user.id,
            acceptedAt: new Date(),
          },
        });

        return user;
      });

      return { success: true, userId: result.id };
    }),
});

export const notificationRouter = router({
  list: orgProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional(),
        unreadOnly: z.boolean().optional(),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.notification.findMany({
        where: {
          orgId: ctx.orgId,
          userId: ctx.session.user.id,
          ...(input.unreadOnly && { read: false }),
        },
        orderBy: { createdAt: "desc" },
        take: input.limit ?? 50,
      });
    }),

  unreadCount: orgProcedure.query(({ ctx }) => {
    return ctx.prisma.notification.count({
      where: {
        orgId: ctx.orgId,
        userId: ctx.session.user.id,
        read: false,
      },
    });
  }),

  markAsRead: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const notification = await ctx.prisma.notification.findFirst({
        where: { id: input.id, orgId: ctx.orgId, userId: ctx.session.user.id },
      });

      if (!notification) {
        throw new Error("Notification not found");
      }

      return ctx.prisma.notification.update({
        where: { id: input.id },
        data: { read: true },
      });
    }),

  markAllAsRead: orgProcedure.mutation(async ({ ctx }) => {
    return ctx.prisma.notification.updateMany({
      where: {
        orgId: ctx.orgId,
        userId: ctx.session.user.id,
        read: false,
      },
      data: { read: true },
    });
  }),
});

export const userSettingsRouter = router({
  getPreferences: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        digestEnabled: true,
        email: true,
        name: true,
      },
    });
  }),

  updatePreferences: protectedProcedure
    .input(
      z.object({
        digestEnabled: z.boolean().optional(),
        name: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: input,
        select: {
          id: true,
          name: true,
          email: true,
          digestEnabled: true,
        },
      });
    }),
});

export const billingRouter = router({
  // Get available plans (public)
  getPlans: publicProcedure.query(() => {
    return Object.entries(PLANS).map(([key, plan]) => ({
      tier: key,
      name: plan.name,
      monthlyPrice: plan.monthlyPrice,
      annualPrice: plan.annualPrice,
      monthlyPriceFormatted: formatPrice(plan.monthlyPrice),
      annualPriceFormatted: formatPrice(plan.annualPrice),
      annualMonthlyEquivalent: formatPrice(plan.annualPrice / 12),
      maxProjects: plan.maxProjects === Infinity ? "Unlimited" : plan.maxProjects,
      maxSeats: plan.maxSeats,
    }));
  }),

  // Get current subscription status
  getSubscriptionStatus: orgProcedure.query(async ({ ctx }) => {
    return getSubscriptionSummary(ctx.orgId, ctx.prisma);
  }),

  // Create checkout session
  createCheckout: orgProcedure
    .input(
      z.object({
        tier: z.enum(["solo", "team", "growth"]),
        interval: z.enum(["monthly", "annual"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get user email for checkout pre-fill
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { email: true },
      });

      const checkoutUrl = await createCheckoutSession(
        ctx.orgId,
        input.tier as PlanTier,
        input.interval as BillingInterval,
        user?.email
      );

      return { checkoutUrl };
    }),

  // Get organization billing info
  getBillingInfo: orgProcedure.query(async ({ ctx }) => {
    const org = await ctx.prisma.organization.findUnique({
      where: { id: ctx.orgId },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        subscriptionEndsAt: true,
      },
    });

    if (!org) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    const summary = await getSubscriptionSummary(ctx.orgId, ctx.prisma);

    // Get current project count
    const projectCount = await ctx.prisma.project.count({
      where: {
        orgId: ctx.orgId,
        status: { not: "completed" },
      },
    });

    // Get current seat count
    const seatCount = await ctx.prisma.user.count({
      where: { orgId: ctx.orgId },
    });

    return {
      ...summary,
      projectCount,
      seatCount,
      trialEndsAt: org.trialEndsAt,
    };
  }),
});

export const appRouter = router({
  auth: authRouter,
  org: orgRouter,
  project: projectRouter,
  task: taskRouter,
  permit: permitRouter,
  purchaseOrder: purchaseOrderRouter,
  crm: clientRouter,
  activityLog: activityLogRouter,
  invite: inviteRouter,
  notification: notificationRouter,
  userSettings: userSettingsRouter,
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;
