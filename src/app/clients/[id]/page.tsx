"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Plus,
  Send,
  MessageSquare,
  PhoneCall,
  ExternalLink,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

const noteSchema = z.object({
  type: z.enum(["note", "call", "email"]),
  content: z.string().min(1, "Content is required"),
});

const emailSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

type NoteFormData = z.infer<typeof noteSchema>;
type EmailFormData = z.infer<typeof emailSchema>;

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isNoteDrawerOpen, setIsNoteDrawerOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);

  const utils = trpc.useUtils();

  const { data: client, isLoading } = trpc.crm.getById.useQuery(
    { id: params.id },
    { enabled: status === "authenticated" }
  );

  const addNote = trpc.crm.addNote.useMutation({
    onSuccess: () => {
      utils.crm.getById.invalidate({ id: params.id });
      setIsNoteDrawerOpen(false);
      resetNote();
    },
  });

  const sendUpdate = trpc.crm.sendUpdate.useMutation({
    onSuccess: () => {
      utils.crm.getById.invalidate({ id: params.id });
      setIsEmailDialogOpen(false);
      resetEmail();
    },
  });

  const {
    register: registerNote,
    handleSubmit: handleSubmitNote,
    reset: resetNote,
    setValue: setNoteValue,
    watch: watchNote,
    formState: { errors: noteErrors },
  } = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: { type: "note" },
  });

  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    reset: resetEmail,
    setValue: setEmailValue,
    watch: watchEmail,
    formState: { errors: emailErrors },
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const onSubmitNote = (data: NoteFormData) => {
    addNote.mutate({
      clientId: params.id,
      type: data.type,
      content: data.content,
    });
  };

  const onSubmitEmail = (data: EmailFormData) => {
    sendUpdate.mutate({
      clientId: params.id,
      projectId: data.projectId,
      subject: data.subject,
      message: data.message,
    });
  };

  const getDaysSinceLastActivity = (): number | null => {
    if (!client?.lastActivityAt) return null;
    return differenceInDays(new Date(), new Date(client.lastActivityAt));
  };

  const getActivityBadge = () => {
    const days = getDaysSinceLastActivity();
    if (days === null) return null;
    if (days >= 14) {
      return <Badge variant="destructive">{days} days since last activity</Badge>;
    }
    if (days >= 7) {
      return <Badge variant="warning">{days} days since last activity</Badge>;
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

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Client not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/clients">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-xl font-bold">{client.name}</h1>
            {getActivityBadge()}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {client.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${client.email}`} className="text-primary hover:underline">
                    {client.email}
                  </a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${client.phone}`} className="text-primary hover:underline">
                    {client.phone}
                  </a>
                </div>
              )}
              {client.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{client.address}</span>
                </div>
              )}
              {client.vatNumber && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>VAT: {client.vatNumber}</span>
                </div>
              )}
              {client.notes && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Projects */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Projects</CardTitle>
              <CardDescription>Projects associated with this client</CardDescription>
            </CardHeader>
            <CardContent>
              {client.projects.length === 0 ? (
                <p className="text-muted-foreground text-sm">No projects yet.</p>
              ) : (
                <div className="space-y-2">
                  {client.projects.map((project: { id: string; name: string; status: string; startDate: string | null; endDate: string | null }) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="block"
                    >
                      <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="py-3 flex items-center justify-between">
                          <div>
                            <span className="font-medium">{project.name}</span>
                            <div className="text-sm text-muted-foreground">
                              {project.startDate && format(new Date(project.startDate), "MMM d, yyyy")}
                              {project.endDate && ` - ${format(new Date(project.endDate), "MMM d, yyyy")}`}
                            </div>
                          </div>
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
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card className="lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Communication Log</CardTitle>
                <CardDescription>Notes, calls, and emails with this client</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetNote();
                    setIsNoteDrawerOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    resetEmail();
                    setIsEmailDialogOpen(true);
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Update
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {client.clientNotes.length === 0 ? (
                <p className="text-muted-foreground text-sm">No communication logged yet.</p>
              ) : (
                <div className="space-y-3">
                  {client.clientNotes.map((note: { id: string; type: string; content: string; createdAt: string; user: { name: string | null } }) => (
                    <div key={note.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {note.type === "call" ? (
                          <PhoneCall className="h-4 w-4 text-primary" />
                        ) : note.type === "email" ? (
                          <Mail className="h-4 w-4 text-primary" />
                        ) : (
                          <MessageSquare className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium capitalize">{note.type}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(note.createdAt), "MMM d, yyyy h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">by {note.user.name || "Unknown"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Add Note Drawer */}
      <Sheet open={isNoteDrawerOpen} onOpenChange={setIsNoteDrawerOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add Note</SheetTitle>
            <SheetDescription>Log a note, call, or email with this client.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmitNote(onSubmitNote)} className="space-y-4 mt-4">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={watchNote("type")}
                onValueChange={(v) => setNoteValue("type", v as "note" | "call" | "email")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note-content">Content</Label>
              <textarea
                id="note-content"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...registerNote("content")}
              />
              {noteErrors.content && (
                <p className="text-sm text-destructive">{noteErrors.content.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={addNote.isPending}>
              {addNote.isPending ? "Saving..." : "Save Note"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Send Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Client Update</DialogTitle>
            <DialogDescription>
              Send an email update to {client.name}. The email will be logged to the communication history.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEmail(onSubmitEmail)} className="space-y-4 mt-4">
            <div className="grid gap-2">
              <Label>Project</Label>
              <Select
                value={watchEmail("projectId") || ""}
                onValueChange={(v) => setEmailValue("projectId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {client.projects.map((p: { id: string; name: string }) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {emailErrors.projectId && (
                <p className="text-sm text-destructive">{emailErrors.projectId.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input id="email-subject" {...registerEmail("subject")} />
              {emailErrors.subject && (
                <p className="text-sm text-destructive">{emailErrors.subject.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email-message">Message</Label>
              <textarea
                id="email-message"
                className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...registerEmail("message")}
              />
              {emailErrors.message && (
                <p className="text-sm text-destructive">{emailErrors.message.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={sendUpdate.isPending}>
              <Send className="h-4 w-4 mr-2" />
              {sendUpdate.isPending ? "Sending..." : "Send Email"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
