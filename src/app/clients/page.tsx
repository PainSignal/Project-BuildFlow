"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { differenceInDays } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  Search,
  Building2,
  Mail,
  Phone,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  vatNumber: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

export default function ClientsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: clients, isLoading } = trpc.crm.list.useQuery(
    { search: search || undefined },
    { enabled: status === "authenticated" }
  );

  const createClient = trpc.crm.create.useMutation({
    onSuccess: () => {
      utils.crm.list.invalidate();
      setIsDrawerOpen(false);
      reset();
    },
  });

  const updateClient = trpc.crm.update.useMutation({
    onSuccess: () => {
      utils.crm.list.invalidate();
      setEditingClientId(null);
      reset();
      setIsDrawerOpen(false);
    },
  });

  const deleteClient = trpc.crm.delete.useMutation({
    onSuccess: () => {
      utils.crm.list.invalidate();
      setIsDrawerOpen(false);
      setEditingClientId(null);
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const onSubmit = (data: ClientFormData) => {
    if (editingClientId) {
      updateClient.mutate({ id: editingClientId, ...data });
    } else {
      createClient.mutate(data);
    }
  };

  const openEditDrawer = (client: NonNullable<typeof clients>[number]) => {
    setEditingClientId(client.id);
    setValue("name", client.name);
    setValue("email", client.email || "");
    setValue("phone", client.phone || "");
    setValue("address", client.address || "");
    setValue("vatNumber", client.vatNumber || "");
    setValue("notes", client.notes || "");
    setIsDrawerOpen(true);
  };

  const getActivityIndicator = (lastActivityAt: Date | string | null): { color: "destructive" | "warning", label: string } | null => {
    if (!lastActivityAt) {
      return { color: "destructive", label: "No activity" };
    }
    const days = differenceInDays(new Date(), new Date(lastActivityAt));
    if (days >= 14) {
      return { color: "destructive", label: `${days} days inactive` };
    }
    if (days >= 7) {
      return { color: "warning", label: `${days} days inactive` };
    }
    return null;
  };

  if (status === "loading" || isLoading) {
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
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Clients</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {session?.user?.email}
            </span>
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
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            onClick={() => {
              reset();
              setEditingClientId(null);
              setIsDrawerOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </div>

        {clients?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No clients yet. Add clients to manage your customer relationships.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients?.map((client: {
              id: string;
              name: string;
              email: string | null;
              phone: string | null;
              vatNumber: string | null;
              projects: Array<{ id: string; name: string; status: string }>;
              _count: { projects: number };
            }) => {
              // Check for inactive clients based on project status
              const hasActiveProjects = client.projects.some(p => p.status === "active");
              const activityIndicator = !hasActiveProjects && client.projects.length > 0 
                ? { color: "warning" as const, label: "No active projects" }
                : null;

              return (
                <Card
                  key={client.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/clients/${client.id}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{client.name}</h3>
                          {client.email && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {client.email}
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {client.phone}
                            </div>
                          )}
                        </div>
                      </div>
                      {activityIndicator && (
                        <Badge variant={activityIndicator.color}>
                          <Clock className="h-3 w-3 mr-1" />
                          {activityIndicator.label}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant="secondary">
                        {client._count.projects} projects
                      </Badge>
                      {client.vatNumber && (
                        <span className="text-xs text-muted-foreground">
                          VAT: {client.vatNumber}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Client Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingClientId ? "Edit Client" : "Add Client"}</SheetTitle>
            <SheetDescription>
              {editingClientId ? "Update client details." : "Create a new client."}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="grid gap-2">
              <Label htmlFor="client-name">Name</Label>
              <Input id="client-name" {...register("name")} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-email">Email</Label>
              <Input id="client-email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-phone">Phone</Label>
              <Input id="client-phone" {...register("phone")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-address">Address</Label>
              <Input id="client-address" {...register("address")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-vatNumber">VAT Number</Label>
              <Input id="client-vatNumber" {...register("vatNumber")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-notes">Notes</Label>
              <Input id="client-notes" {...register("notes")} />
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={createClient.isPending || updateClient.isPending}
              >
                {createClient.isPending || updateClient.isPending
                  ? "Saving..."
                  : editingClientId
                  ? "Save Changes"
                  : "Create Client"}
              </Button>
              {editingClientId && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    deleteClient.mutate({ id: editingClientId });
                  }}
                  disabled={deleteClient.isPending}
                >
                  Delete
                </Button>
              )}
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
