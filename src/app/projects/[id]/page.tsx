"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { format, isPast, isToday, differenceInDays } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Building2,
  Calendar,
  User,
  Plus,
  CheckCircle,
  Circle,
  AlertCircle,
  Clock,
  FileText,
  Package,
  Activity,
  Ban,
  Trash2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  taskType: z.enum(["general", "permit", "material", "client"]).optional(),
  blocked: z.boolean().optional(),
  dueDate: z.string().optional(),
});

const permitSchema = z.object({
  name: z.string().min(1, "Name is required"),
  permitNumber: z.string().optional(),
  deadline: z.string().min(1, "Deadline is required"),
  notes: z.string().optional(),
  fileUrl: z.string().optional(),
  status: z.enum(["pending", "submitted", "approved", "rejected"]).optional(),
});

const purchaseOrderSchema = z.object({
  vendor: z.string().min(1, "Vendor is required"),
  vatRate: z.number().min(0).max(100),
  lineItems: z.array(
    z.object({
      id: z.string().optional(),
      description: z.string().min(1),
      quantity: z.number().int().positive(),
      unitPrice: z.number().positive(),
    })
  ).min(1, "At least one line item is required"),
});

type TaskFormData = z.infer<typeof taskSchema>;
type PermitFormData = z.infer<typeof permitSchema>;
type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;

type TaskStatus = "todo" | "in_progress" | "done";
type TaskType = "general" | "permit" | "material" | "client";
type TaskPriority = "low" | "medium" | "high";
type PermitStatus = "pending" | "submitted" | "approved" | "rejected";
type POStatus = "draft" | "sent" | "confirmed" | "delivered" | "cancelled";

const statusColors: Record<TaskStatus, "default" | "secondary" | "success" | "warning" | "outline"> = {
  todo: "secondary",
  in_progress: "default",
  done: "success",
};

const priorityColors: Record<TaskPriority, "default" | "secondary" | "destructive" | "warning"> = {
  low: "secondary",
  medium: "default",
  high: "destructive",
};

const permitStatusColors: Record<PermitStatus, "default" | "secondary" | "success" | "destructive" | "warning"> = {
  pending: "secondary",
  submitted: "default",
  approved: "success",
  rejected: "destructive",
};

const poStatusColors: Record<POStatus, "default" | "secondary" | "success" | "destructive" | "warning"> = {
  draft: "secondary",
  sent: "default",
  confirmed: "warning",
  delivered: "success",
  cancelled: "destructive",
};

const taskTypeIcons: Record<TaskType, React.ReactNode> = {
  general: <FileText className="h-3 w-3" />,
  permit: <FileText className="h-3 w-3" />,
  material: <Package className="h-3 w-3" />,
  client: <User className="h-3 w-3" />,
};

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"dueDate" | "status" | "priority">("dueDate");
  
  // Permit state
  const [isPermitDrawerOpen, setIsPermitDrawerOpen] = useState(false);
  const [editingPermitId, setEditingPermitId] = useState<string | null>(null);
  
  // Purchase Order state
  const [isPODrawerOpen, setIsPODrawerOpen] = useState(false);
  const [editingPOId, setEditingPOId] = useState<string | null>(null);
  const [expandedPOId, setExpandedPOId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: project, isLoading } = trpc.project.getById.useQuery(
    { id: params.id },
    { enabled: status === "authenticated" }
  );

  const { data: members } = trpc.org.getMembers.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  const { data: activityLog } = trpc.activityLog.list.useQuery(
    { entityType: "project", entityId: params.id },
    { enabled: status === "authenticated" }
  );

  // Task mutations
  const createTask = trpc.task.create.useMutation({
    onSuccess: () => {
      utils.project.getById.invalidate({ id: params.id });
      setIsTaskDrawerOpen(false);
      resetTask();
    },
  });

  const updateTask = trpc.task.update.useMutation({
    onSuccess: () => {
      utils.project.getById.invalidate({ id: params.id });
      setEditingTaskId(null);
      resetTask();
    },
  });

  const deleteTask = trpc.task.delete.useMutation({
    onSuccess: () => {
      utils.project.getById.invalidate({ id: params.id });
    },
  });

  // Permit mutations
  const createPermit = trpc.permit.create.useMutation({
    onSuccess: () => {
      utils.project.getById.invalidate({ id: params.id });
      setIsPermitDrawerOpen(false);
      resetPermit();
    },
  });

  const updatePermit = trpc.permit.update.useMutation({
    onSuccess: () => {
      utils.project.getById.invalidate({ id: params.id });
      setEditingPermitId(null);
      resetPermit();
    },
  });

  const deletePermit = trpc.permit.delete.useMutation({
    onSuccess: () => {
      utils.project.getById.invalidate({ id: params.id });
      setIsPermitDrawerOpen(false);
      setEditingPermitId(null);
    },
  });

  // Purchase Order mutations
  const createPO = trpc.purchaseOrder.create.useMutation({
    onSuccess: () => {
      utils.project.getById.invalidate({ id: params.id });
      setIsPODrawerOpen(false);
      resetPO();
    },
  });

  const updatePO = trpc.purchaseOrder.update.useMutation({
    onSuccess: () => {
      utils.project.getById.invalidate({ id: params.id });
      utils.purchaseOrder.getById.invalidate({ id: editingPOId || "" });
    },
  });

  const deletePO = trpc.purchaseOrder.delete.useMutation({
    onSuccess: () => {
      utils.project.getById.invalidate({ id: params.id });
      setIsPODrawerOpen(false);
      setEditingPOId(null);
    },
  });

  const addLineItem = trpc.purchaseOrder.addLineItem.useMutation({
    onSuccess: () => {
      utils.project.getById.invalidate({ id: params.id });
    },
  });

  const deleteLineItem = trpc.purchaseOrder.deleteLineItem.useMutation({
    onSuccess: () => {
      utils.project.getById.invalidate({ id: params.id });
    },
  });

  const {
    register,
    handleSubmit,
    reset: resetTask,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
  });

  // Permit form
  const {
    register: registerPermit,
    handleSubmit: handleSubmitPermit,
    reset: resetPermit,
    setValue: setPermitValue,
    watch: watchPermit,
    formState: { errors: permitErrors },
  } = useForm<PermitFormData>({
    resolver: zodResolver(permitSchema),
  });

  // Purchase Order form
  const {
    register: registerPO,
    handleSubmit: handleSubmitPO,
    reset: resetPO,
    setValue: setPOValue,
    watch: watchPO,
    formState: { errors: poErrors },
  } = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      vendor: "",
      vatRate: 21,
      lineItems: [{ description: "", quantity: 1, unitPrice: 0 }],
    },
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const onSubmitTask = (data: TaskFormData) => {
    const payload = {
      ...data,
      projectId: params.id,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      assigneeId: data.assigneeId || undefined,
    };

    if (editingTaskId) {
      updateTask.mutate({ id: editingTaskId, ...payload });
    } else {
      createTask.mutate(payload);
    }
  };

  const openEditTaskDrawer = (task: NonNullable<typeof project>["tasks"][number]) => {
    setEditingTaskId(task.id);
    setValue("title", task.title);
    setValue("description", task.description || "");
    setValue("assigneeId", task.assigneeId || "");
    setValue("priority", task.priority as TaskPriority);
    setValue("taskType", task.taskType as TaskType);
    setValue("blocked", task.blocked);
    setValue("dueDate", task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "");
    setIsTaskDrawerOpen(true);
  };

  const toggleTaskStatus = (task: NonNullable<typeof project>["tasks"][number]) => {
    const newStatus: TaskStatus = task.status === "done" ? "todo" : "done";
    updateTask.mutate({ id: task.id, status: newStatus });
  };

  // Permit handlers
  const onSubmitPermit = (data: PermitFormData) => {
    const payload = {
      projectId: params.id,
      name: data.name,
      permitNumber: data.permitNumber || undefined,
      deadline: new Date(data.deadline).toISOString(),
      notes: data.notes || undefined,
      fileUrl: data.fileUrl || undefined,
    };

    if (editingPermitId) {
      updatePermit.mutate({ id: editingPermitId, ...payload });
    } else {
      createPermit.mutate(payload);
    }
  };

  const openEditPermitDrawer = (permit: NonNullable<typeof project>["permits"][number]) => {
    setEditingPermitId(permit.id);
    setPermitValue("name", permit.name);
    setPermitValue("permitNumber", permit.permitNumber || "");
    setPermitValue("deadline", format(new Date(permit.deadline), "yyyy-MM-dd"));
    setPermitValue("notes", permit.notes || "");
    setPermitValue("fileUrl", (permit as { fileUrl?: string }).fileUrl || "");
    setIsPermitDrawerOpen(true);
  };

  // Purchase Order handlers
  const onSubmitPO = (data: PurchaseOrderFormData) => {
    const payload = {
      projectId: params.id,
      vendor: data.vendor,
      vatRate: data.vatRate,
      lineItems: data.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    };

    if (editingPOId) {
      updatePO.mutate({ id: editingPOId, ...payload });
    } else {
      createPO.mutate(payload);
    }
  };

  const openEditPODrawer = (order: NonNullable<typeof project>["purchaseOrders"][number]) => {
    setEditingPOId(order.id);
    setPOValue("vendor", order.vendor);
    setPOValue("vatRate", Number(order.vatRate));
    setPOValue("lineItems", order.lineItems.map((item: NonNullable<typeof project>["purchaseOrders"][number]["lineItems"][number]) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    })));
    setIsPODrawerOpen(true);
  };

  const handlePOStatusChange = (orderId: string, newStatus: POStatus) => {
    updatePO.mutate({ id: orderId, status: newStatus });
  };

  // Helper function to calculate days to deadline
  const getDaysToDeadline = (deadline: Date | string): number => {
    return differenceInDays(new Date(deadline), new Date());
  };

  // Helper to get deadline badge color
  const getDeadlineBadgeVariant = (days: number, status: string): "default" | "secondary" | "destructive" | "warning" | "success" | "outline" => {
    if (status === "approved") return "success";
    if (status === "rejected") return "destructive";
    if (days < 0) return "destructive";
    if (days <= 3) return "destructive";
    if (days <= 7) return "warning";
    return "secondary";
  };

  const sortedTasks = project?.tasks
    ? [...project.tasks].sort((a, b) => {
        if (sortBy === "dueDate") {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (sortBy === "status") {
          const order: Record<TaskStatus, number> = { todo: 0, in_progress: 1, done: 2 };
          return order[a.status as TaskStatus] - order[b.status as TaskStatus];
        }
        if (sortBy === "priority") {
          const order: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
          return order[a.priority as TaskPriority] - order[b.priority as TaskPriority];
        }
        return 0;
      })
    : [];

  const completedTasks = project?.tasks.filter((t: { status: string }) => t.status === "done").length || 0;
  const totalTasks = project?.tasks.length || 0;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Project not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-xl font-bold">{project.name}</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {session?.user?.email}
            </span>
            <Link href="/settings/team">
              <Button variant="outline" size="sm">
                Settings
              </Button>
            </Link>
            <form action="/api/auth/signout" method="POST">
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Project Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant={
                project.status === "active"
                  ? "success"
                  : project.status === "on_hold"
                  ? "warning"
                  : "secondary"
              }
            >
              {project.status.replace("_", " ")}
            </Badge>
            {project.client && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {project.client.name}
              </span>
            )}
          </div>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            {project.projectManager && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {project.projectManager.name}
              </span>
            )}
            {project.endDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                End: {format(new Date(project.endDate), "MMM d, yyyy")}
              </span>
            )}
            {project.budget && (
              <span>Budget: ${Number(project.budget).toLocaleString()}</span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({totalTasks})</TabsTrigger>
            <TabsTrigger value="permits">Permits ({project.permits.length})</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(progress)}%</div>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {completedTasks} of {totalTasks} tasks completed
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {project.tasks
                      .filter((t: { status: string }) => t.status !== "done")
                      .slice(0, 3)
                      .map((task: { id: string; title: string; dueDate: Date | string | null }) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="truncate">{task.title}</span>
                          {task.dueDate && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(task.dueDate), "MMM d")}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {activityLog?.slice(0, 3).map((log: { id: string; action: string; entityType: string }) => (
                      <div key={log.id} className="text-sm">
                        <span className="font-medium">{log.action}</span>{" "}
                        <span className="text-muted-foreground">{log.entityType}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dueDate">Due Date</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => {
                  resetTask();
                  setEditingTaskId(null);
                  setIsTaskDrawerOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>

            <div className="space-y-2">
              {sortedTasks.map((task) => {
                const isOverdue =
                  task.dueDate &&
                  isPast(new Date(task.dueDate)) &&
                  task.status !== "done";
                const isDueToday =
                  task.dueDate &&
                  isToday(new Date(task.dueDate)) &&
                  task.status !== "done";

                return (
                  <Card
                    key={task.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                      isOverdue ? "border-red-300 bg-red-50" : ""
                    }`}
                    onClick={() => openEditTaskDrawer(task)}
                  >
                    <CardContent className="py-3">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTaskStatus(task);
                          }}
                          className="mt-1"
                        >
                          {task.status === "done" ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium ${
                                task.status === "done" ? "line-through text-muted-foreground" : ""
                              }`}
                            >
                              {task.title}
                            </span>
                            {task.blocked && (
                              <Ban className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={statusColors[task.status as TaskStatus]} className="text-xs">
                              {task.status.replace("_", " ")}
                            </Badge>
                            <Badge variant={priorityColors[task.priority as TaskPriority]} className="text-xs">
                              {task.priority}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              {taskTypeIcons[task.taskType as TaskType]}
                              {task.taskType}
                            </span>
                            {task.dueDate && (
                              <span
                                className={`text-xs flex items-center gap-1 ${
                                  isOverdue
                                    ? "text-red-600"
                                    : isDueToday
                                    ? "text-yellow-600"
                                    : "text-muted-foreground"
                                }`}
                              >
                                <Clock className="h-3 w-3" />
                                {format(new Date(task.dueDate), "MMM d")}
                              </span>
                            )}
                            {task.assignee && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Avatar className="h-4 w-4">
                                  <AvatarFallback className="text-[8px]">
                                    {getInitials(task.assignee.name)}
                                  </AvatarFallback>
                                </Avatar>
                                {task.assignee.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Permits Tab */}
          <TabsContent value="permits" className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  resetPermit();
                  setEditingPermitId(null);
                  setIsPermitDrawerOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Permit
              </Button>
            </div>
            {project.permits.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No permits yet. Add permits to track project approvals.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {[...project.permits]
                  .sort((a, b) => 
                    new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
                  )
                  .map((permit) => {
                    const daysToDeadline = getDaysToDeadline(permit.deadline);
                    const deadlineVariant = getDeadlineBadgeVariant(daysToDeadline, permit.status);
                    
                    return (
                      <Card
                        key={permit.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => openEditPermitDrawer(permit)}
                      >
                        <CardContent className="py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{permit.name}</span>
                                {permit.permitNumber && (
                                  <span className="text-sm text-muted-foreground">
                                    #{permit.permitNumber}
                                  </span>
                                )}
                                {permit.fileUrl && (
                                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                              {permit.notes && (
                                <p className="text-sm text-muted-foreground mt-1 truncate">
                                  {permit.notes}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={permitStatusColors[permit.status as PermitStatus]}>
                                {permit.status}
                              </Badge>
                              <Badge variant={deadlineVariant}>
                                {daysToDeadline < 0 
                                  ? `${Math.abs(daysToDeadline)} days overdue`
                                  : daysToDeadline === 0 
                                  ? "Due today"
                                  : `${daysToDeadline} days left`
                                }
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(permit.deadline), "MMM d, yyyy")}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </TabsContent>

          {/* Materials Tab */}
          <TabsContent value="materials" className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  resetPO();
                  setEditingPOId(null);
                  setIsPODrawerOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Purchase Order
              </Button>
            </div>
            {project.purchaseOrders.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No purchase orders yet. Create orders to track materials.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {project.purchaseOrders.map((order: NonNullable<typeof project>["purchaseOrders"][number]) => {
                  const isExpanded = expandedPOId === order.id;
                  const totalAmount = Number(order.totalAmount);
                  const vatAmount = Number(order.vatAmount);
                  
                  return (
                    <Card key={order.id} className="overflow-hidden">
                      <CardContent className="py-3">
                        <div 
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => setExpandedPOId(isExpanded ? null : order.id)}
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="font-medium">{order.vendor}</span>
                            <span className="text-sm text-muted-foreground">
                              {order.lineItems.length} items
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={order.status}
                              onValueChange={(value) => handlePOStatusChange(order.id, value as POStatus)}
                            >
                              <SelectTrigger className="w-[130px]" onClick={(e) => e.stopPropagation()}>
                                <Badge variant={poStatusColors[order.status as POStatus]}>
                                  {order.status}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="sent">Sent</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                            <span className="text-sm font-medium">
                              €{totalAmount.toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              (+€{vatAmount.toLocaleString()} VAT)
                            </span>
                          </div>
                        </div>
                        
                        {/* Expandable Line Items */}
                        {isExpanded && (
                          <div className="mt-4 border-t pt-4">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-muted-foreground">
                                  <th className="pb-2">Description</th>
                                  <th className="pb-2 text-right">Qty</th>
                                  <th className="pb-2 text-right">Unit Price</th>
                                  <th className="pb-2 text-right">Total</th>
                                  <th className="pb-2"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.lineItems.map((item: (typeof order)["lineItems"][number]) => {
                                  const unitPrice = Number(item.unitPrice);
                                  const totalPrice = Number(item.totalPrice);
                                  
                                  return (
                                    <tr key={item.id} className="border-t">
                                      <td className="py-2">{item.description}</td>
                                      <td className="py-2 text-right">{item.quantity}</td>
                                      <td className="py-2 text-right">€{unitPrice.toLocaleString()}</td>
                                      <td className="py-2 text-right font-medium">€{totalPrice.toLocaleString()}</td>
                                      <td className="py-2 text-right">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteLineItem.mutate({ id: item.id });
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                        </Button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            <div className="flex justify-end mt-4 gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditPODrawer(order)}
                              >
                                Edit PO
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this purchase order?")) {
                                    deletePO.mutate({ id: order.id });
                                  }
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            {activityLog?.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No activity recorded yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {activityLog?.map((log: { id: string; action: string; entityType: string; createdAt: Date | string; user: { name: string | null } }) => (
                  <Card key={log.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getInitials(log.user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{log.user.name}</span>
                          <span className="text-muted-foreground">{log.action}</span>
                          <span className="text-muted-foreground">{log.entityType}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Task Drawer */}
        <Sheet open={isTaskDrawerOpen} onOpenChange={setIsTaskDrawerOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{editingTaskId ? "Edit Task" : "Add Task"}</SheetTitle>
              <SheetDescription>
                {editingTaskId ? "Update task details." : "Create a new task for this project."}
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSubmit(onSubmitTask)} className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="task-title">Title</Label>
                <Input id="task-title" {...register("title")} />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-description">Description</Label>
                <Input id="task-description" {...register("description")} />
              </div>
              <div className="grid gap-2">
                <Label>Assignee</Label>
                <Select
                  value={watch("assigneeId") || ""}
                  onValueChange={(v) => setValue("assigneeId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {members?.map((member: { id: string; name: string | null; email: string }) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Priority</Label>
                  <Select
                    value={watch("priority") || "medium"}
                    onValueChange={(v) => setValue("priority", v as TaskPriority)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Task Type</Label>
                  <Select
                    value={watch("taskType") || "general"}
                    onValueChange={(v) => setValue("taskType", v as TaskType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="permit">Permit</SelectItem>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-dueDate">Due Date</Label>
                <Input id="task-dueDate" type="date" {...register("dueDate")} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="task-blocked"
                  checked={watch("blocked") || false}
                  onChange={(e) => setValue("blocked", e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="task-blocked">Blocked</Label>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createTask.isPending || updateTask.isPending}
                >
                  {createTask.isPending || updateTask.isPending
                    ? "Saving..."
                    : editingTaskId
                    ? "Save Changes"
                    : "Create Task"}
                </Button>
                {editingTaskId && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      deleteTask.mutate({ id: editingTaskId });
                      setIsTaskDrawerOpen(false);
                      setEditingTaskId(null);
                    }}
                    disabled={deleteTask.isPending}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </form>
          </SheetContent>
        </Sheet>

        {/* Permit Drawer */}
        <Sheet open={isPermitDrawerOpen} onOpenChange={setIsPermitDrawerOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{editingPermitId ? "Edit Permit" : "Add Permit"}</SheetTitle>
              <SheetDescription>
                {editingPermitId ? "Update permit details." : "Create a new permit for this project."}
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSubmitPermit(onSubmitPermit)} className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="permit-name">Name</Label>
                <Input id="permit-name" {...registerPermit("name")} />
                {permitErrors.name && (
                  <p className="text-sm text-destructive">{permitErrors.name.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="permit-number">Permit Number (optional)</Label>
                <Input id="permit-number" {...registerPermit("permitNumber")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="permit-deadline">Deadline</Label>
                <Input id="permit-deadline" type="date" {...registerPermit("deadline")} />
                {permitErrors.deadline && (
                  <p className="text-sm text-destructive">{permitErrors.deadline.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="permit-notes">Notes (optional)</Label>
                <Input id="permit-notes" {...registerPermit("notes")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="permit-fileUrl">File URL (optional)</Label>
                <Input 
                  id="permit-fileUrl" 
                  placeholder="https://..." 
                  {...registerPermit("fileUrl")} 
                />
              </div>
              {editingPermitId && (
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    value={(watchPermit("status") as PermitStatus) || "pending"}
                    onValueChange={(v) => setPermitValue("status", v as PermitStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createPermit.isPending || updatePermit.isPending}
                >
                  {createPermit.isPending || updatePermit.isPending
                    ? "Saving..."
                    : editingPermitId
                    ? "Save Changes"
                    : "Create Permit"}
                </Button>
                {editingPermitId && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      deletePermit.mutate({ id: editingPermitId });
                    }}
                    disabled={deletePermit.isPending}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </form>
          </SheetContent>
        </Sheet>

        {/* Purchase Order Drawer */}
        <Sheet open={isPODrawerOpen} onOpenChange={setIsPODrawerOpen}>
          <SheetContent className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>{editingPOId ? "Edit Purchase Order" : "Create Purchase Order"}</SheetTitle>
              <SheetDescription>
                {editingPOId ? "Update purchase order details." : "Create a new purchase order for materials."}
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSubmitPO(onSubmitPO)} className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="po-vendor">Vendor</Label>
                <Input id="po-vendor" {...registerPO("vendor")} />
                {poErrors.vendor && (
                  <p className="text-sm text-destructive">{poErrors.vendor.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="po-vatRate">VAT Rate (%)</Label>
                <Input 
                  id="po-vatRate" 
                  type="number" 
                  step="0.1"
                  {...registerPO("vatRate", { valueAsNumber: true })} 
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Line Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const items = watchPO("lineItems") || [];
                      setPOValue("lineItems", [...items, { description: "", quantity: 1, unitPrice: 0 }]);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Item
                  </Button>
                </div>
                {poErrors.lineItems && (
                  <p className="text-sm text-destructive">{poErrors.lineItems.message}</p>
                )}
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {watchPO("lineItems")?.map((item, index) => (
                    <div key={index} className="grid grid-cols-[1fr,60px,80px,32px] gap-2 items-start">
                      <Input
                        placeholder="Description"
                        {...registerPO(`lineItems.${index}.description`)}
                      />
                      <Input
                        type="number"
                        placeholder="Qty"
                        {...registerPO(`lineItems.${index}.quantity`, { valueAsNumber: true })}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        {...registerPO(`lineItems.${index}.unitPrice`, { valueAsNumber: true })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const items = watchPO("lineItems") || [];
                          setPOValue(
                            "lineItems",
                            items.filter((_: { description: string; quantity: number; unitPrice: number }, i: number) => i !== index)
                          );
                        }}
                        disabled={watchPO("lineItems")?.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createPO.isPending || updatePO.isPending}
                >
                  {createPO.isPending || updatePO.isPending
                    ? "Saving..."
                    : editingPOId
                    ? "Save Changes"
                    : "Create Purchase Order"}
                </Button>
                {editingPOId && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      deletePO.mutate({ id: editingPOId });
                    }}
                    disabled={deletePO.isPending}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </form>
          </SheetContent>
        </Sheet>
      </main>
    </div>
  );
}
