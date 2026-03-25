"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Member {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

export default function SettingsTeamPage() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = session?.user?.role === "owner" || session?.user?.role === "admin";

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Load members
      const membersRes = await fetch("/api/trpc/org.getMembers");
      const membersData = await membersRes.json();
      if (membersData?.result?.data) {
        setMembers(membersData.result.data);
      }

      // Load invites
      const invitesRes = await fetch("/api/trpc/invite.list");
      const invitesData = await invitesRes.json();
      if (invitesData?.result?.data) {
        setInvites(invitesData.result.data);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/trpc/invite.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: { email: inviteEmail, role: inviteRole },
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error.message || "Failed to send invite");
        return;
      }

      setInviteEmail("");
      setInviteRole("member");
      loadData();
    } catch (err) {
      setError("Failed to send invite");
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      const res = await fetch("/api/trpc/org.updateMemberRole", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: { userId, role: newRole },
        }),
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error.message);
        return;
      }

      loadData();
    } catch (err) {
      alert("Failed to update role");
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const res = await fetch("/api/trpc/org.removeMember", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: { userId },
        }),
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error.message);
        return;
      }

      loadData();
    } catch (err) {
      alert("Failed to remove member");
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    if (!confirm("Are you sure you want to revoke this invite?")) return;

    try {
      const res = await fetch("/api/trpc/invite.revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: { inviteId },
        }),
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error.message);
        return;
      }

      loadData();
    } catch (err) {
      alert("Failed to revoke invite");
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Team Settings</h1>
        <p className="text-muted-foreground">Manage your team members and invitations</p>
      </div>

      <div className="flex gap-4 border-b pb-4">
        <Link
          href="/settings"
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Account
        </Link>
        <Link
          href="/settings/team"
          className="px-4 py-2 text-sm font-medium border-b-2 border-primary"
        >
          Team
        </Link>
      </div>

      {/* Invite Team Member */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Invite Team Member</CardTitle>
            <CardDescription>
              Send an invitation to add a new team member
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
              )}
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="email" className="sr-only">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="teammate@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    disabled={inviteLoading}
                  />
                </div>
                <select
                  className="border rounded-md px-3"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                  disabled={inviteLoading}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <Button type="submit" disabled={inviteLoading}>
                  {inviteLoading ? "Sending..." : "Send Invite"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {members.length} member{members.length !== 1 ? "s" : ""} in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                {isAdmin && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.name || "—"}
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    {isAdmin && member.id !== session?.user?.id ? (
                      <select
                        className="border rounded px-2 py-1 text-sm"
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                    ) : (
                      <span className="capitalize">{member.role}</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(member.createdAt)}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      {member.id !== session?.user?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {invites.filter((i) => i.status === "pending").length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invites</CardTitle>
            <CardDescription>
              Invitations waiting for acceptance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  {isAdmin && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites
                  .filter((i) => i.status === "pending")
                  .map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>{invite.email}</TableCell>
                      <TableCell className="capitalize">{invite.role}</TableCell>
                      <TableCell>{formatDate(invite.expiresAt)}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleRevokeInvite(invite.id)}
                          >
                            Revoke
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
