"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Building2,
  Calendar,
  User,
  MoreHorizontal,
  Pencil,
  Trash2,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

const projectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  clientId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().optional(),
  projectManagerId: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

type ProjectStatus = "active" | "on_hold" | "completed";

const statusColors: Record<ProjectStatus, "default" | "secondary" | "success" | "warning" | "outline"> = {
  active: "success",
  on_hold: "warning",
  completed: "secondary",
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

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: projects, isLoading } = trpc.project.list.useQuery(
    { status: statusFilter === "all" ? undefined : statusFilter },
    { enabled: status === "authenticated" }
  );

  const { data: clients } = trpc.crm.list.useQuery({}, {
    enabled: status === "authenticated",
  });

  const { data: members } = trpc.org.getMembers.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  const createProject = trpc.project.create.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate();
      setIsCreateOpen(false);
      reset();
    },
  });

  const updateProject = trpc.project.update.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate();
      setEditingProject(null);
      reset();
    },
  });

  const deleteProject = trpc.project.delete.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate();
      setDeleteProjectId(null);
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const res = await fetch("/api/auth/check-onboarding");
        const data = await res.json();
        if (data.needsOnboarding) {
          router.push("/onboarding");
        }
      } catch (err) {
        console.error("Failed to check onboarding:", err);
      }
    }

    if (status === "authenticated") {
      checkOnboarding();
    }
  }, [status, router]);

  const onSubmit = (data: ProjectFormData) => {
    // Convert empty strings to undefined and non-empty strings to Date objects
    const payload: any = {
      name: data.name,
      description: data.description || undefined,
      clientId: data.clientId || undefined,
      projectManagerId: data.projectManagerId || undefined,
      budget: data.budget || undefined,
    };

    // Only include startDate if it's a non-empty string
    if (data.startDate && data.startDate.trim() !== "") {
      payload.startDate = new Date(data.startDate);
    }

    // Only include endDate if it's a non-empty string
    if (data.endDate && data.endDate.trim() !== "") {
      payload.endDate = new Date(data.endDate);
    }

    console.log('Submitting payload:', payload);

    if (editingProject) {
      updateProject.mutate({ id: editingProject, ...payload });
    } else {
      createProject.mutate(payload);
    }
  };

  const openEditSheet = (project: {
    id: string;
    name: string;
    status: string;
    description: string | null;
    endDate: Date | string | null;
    startDate: Date | string | null;
    clientId: string | null;
    client: { name: string } | null;
    projectManagerId: string | null;
    projectManager: { id: string; name: string | null } | null;
    budget: number | null;
  }) => {
    setEditingProject(project.id);
    setValue("name", project.name);
    setValue("description", project.description || "");
    setValue("clientId", project.clientId || "");
    setValue("startDate", project.startDate ? format(new Date(project.startDate), "yyyy-MM-dd") : "");
    setValue("endDate", project.endDate ? format(new Date(project.endDate), "yyyy-MM-dd") : "");
    setValue("budget", project.budget || undefined);
    setValue("projectManagerId", project.projectManagerId || "");
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">BuildFlow</h1>
          <div className="flex items-center gap-4">
            <Link href="/clients">
              <Button variant="ghost" size="sm">
                Clients
              </Button>
            </Link>
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Projects</h2>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { reset(); setEditingProject(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit(onSubmit)}>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Fill in the details to create a new project.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" {...register("name")} />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" {...register("description")} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="client">Client</Label>
                    <Select onValueChange={(v) => setValue("clientId", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients?.map((client: { id: string; name: string }) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        {...register("startDate")}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        {...register("endDate")}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="budget">Budget</Label>
                      <Input
                        id="budget"
                        type="number"
                        step="0.01"
                        {...register("budget", { valueAsNumber: true })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pm">Project Manager</Label>
                      <Select onValueChange={(v) => setValue("projectManagerId", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select PM" />
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
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createProject.isPending}>
                    {createProject.isPending ? "Creating..." : "Create Project"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Status Filter Bar */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            All
          </Button>
          <Button
            variant={statusFilter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("active")}
          >
            Active
          </Button>
          <Button
            variant={statusFilter === "on_hold" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("on_hold")}
          >
            On Hold
          </Button>
          <Button
            variant={statusFilter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("completed")}
          >
            Complete
          </Button>
        </div>

        {/* Project Cards Grid */}
        {isLoading ? (
          <p>Loading projects...</p>
        ) : projects?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No projects found. Create your first project to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects?.map((project: {
              id: string;
              name: string;
              status: string;
              description: string | null;
              endDate: Date | string | null;
              startDate: Date | string | null;
              clientId: string | null;
              client: { name: string } | null;
              projectManagerId: string | null;
              projectManager: { id: string; name: string | null } | null;
              budget: number | null;
              _count: { tasks: number };
            }) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link href={`/projects/${project.id}`}>
                        <CardTitle className="text-lg hover:underline cursor-pointer">
                          {project.name}
                        </CardTitle>
                      </Link>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Building2 className="h-3 w-3" />
                        {project.client?.name || "No client"}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditSheet(project)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteProjectId(project.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={statusColors[project.status as ProjectStatus]}>
                      {project.status.replace("_", " ")}
                    </Badge>
                    {project.projectManager && (
                      <div className="flex items-center gap-1">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[10px]">
                            {getInitials(project.projectManager.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {project.projectManager.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {project.endDate
                        ? format(new Date(project.endDate), "MMM d, yyyy")
                        : "No end date"}
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{project._count.tasks} tasks</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Sheet */}
        <Sheet open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Edit Project</SheetTitle>
              <SheetDescription>
                Update project details.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" {...register("name")} />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input id="edit-description" {...register("description")} />
              </div>
              <div className="grid gap-2">
                <Label>Client</Label>
                <Select
                  value={watch("clientId") || ""}
                  onValueChange={(v) => setValue("clientId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client: { id: string; name: string }) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-startDate">Start Date</Label>
                  <Input
                    id="edit-startDate"
                    type="date"
                    {...register("startDate")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-endDate">End Date</Label>
                  <Input
                    id="edit-endDate"
                    type="date"
                    {...register("endDate")}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-budget">Budget</Label>
                  <Input
                    id="edit-budget"
                    type="number"
                    step="0.01"
                    {...register("budget", { valueAsNumber: true })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Project Manager</Label>
                  <Select
                    value={watch("projectManagerId") || ""}
                    onValueChange={(v) => setValue("projectManagerId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select PM" />
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
              </div>
              <Button type="submit" className="w-full" disabled={updateProject.isPending}>
                {updateProject.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteProjectId} onOpenChange={(open) => !open && setDeleteProjectId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Project</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this project? This action cannot be undone.
                All tasks, permits, and purchase orders will be deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteProjectId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteProjectId && deleteProject.mutate({ id: deleteProjectId })}
                disabled={deleteProject.isPending}
              >
                {deleteProject.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
