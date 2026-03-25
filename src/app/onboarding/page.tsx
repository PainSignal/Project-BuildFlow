"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Invitee {
  email: string;
  role: "admin" | "member";
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Organization name
  const [orgName, setOrgName] = useState("");

  // Step 2: Team invites
  const [invites, setInvites] = useState<Invitee[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "member">("member");

  // Step 3: First project
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.orgSlug) {
      // Fetch current org name
      fetch("/api/trpc/org.getCurrent")
        .then((res) => res.json())
        .then((data) => {
          if (data?.result?.data?.name) {
            setOrgName(data.result.data.name);
          }
        })
        .catch(console.error);
    }
  }, [session]);

  const addInvite = () => {
    if (!newEmail || !newEmail.includes("@")) return;
    if (invites.some((i) => i.email === newEmail)) return;

    setInvites([...invites, { email: newEmail, role: newRole }]);
    setNewEmail("");
    setNewRole("member");
  };

  const removeInvite = (email: string) => {
    setInvites(invites.filter((i) => i.email !== email));
  };

  const handleCompleteOnboarding = async () => {
    setLoading(true);
    setError(null);

    try {
      // Update org name if changed
      if (orgName) {
        await fetch("/api/trpc/org.update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            json: { name: orgName },
          }),
        });
      }

      // Send invites
      for (const invite of invites) {
        await fetch("/api/trpc/invite.create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            json: { email: invite.email, role: invite.role },
          }),
        });
      }

      // Create first project if provided
      if (projectName) {
        await fetch("/api/trpc/project.create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            json: { name: projectName },
          }),
        });
      }

      // Mark onboarding as complete
      const res = await fetch("/api/auth/complete-onboarding", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to complete onboarding");
      }

      router.push("/dashboard");
    } catch (err) {
      setError("Failed to complete onboarding. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkipInvites = () => {
    setStep(3);
  };

  const handleSkipProject = () => {
    handleCompleteOnboarding();
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Step {step} of 3</span>
            <div className="flex gap-1">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`w-8 h-1 rounded ${
                    s <= step ? "bg-primary" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
          </div>
          {step === 1 && (
            <>
              <CardTitle>Confirm your company name</CardTitle>
              <CardDescription>
                This will be displayed to your team and clients
              </CardDescription>
            </>
          )}
          {step === 2 && (
            <>
              <CardTitle>Invite your team</CardTitle>
              <CardDescription>
                Add teammates to collaborate on projects (optional)
              </CardDescription>
            </>
          )}
          {step === 3 && (
            <>
              <CardTitle>Create your first project</CardTitle>
              <CardDescription>
                Get started by creating a project to track tasks, permits, and orders
              </CardDescription>
            </>
          )}
        </CardHeader>

        {error && (
          <div className="px-6 pb-2">
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          </div>
        )}

        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Company Name</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Acme Construction Ltd"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="teammate@company.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInvite())}
                  />
                </div>
                <select
                  className="border rounded-md px-3 text-sm"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as "admin" | "member")}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <Button type="button" onClick={addInvite} variant="outline">
                  Add
                </Button>
              </div>

              {invites.length > 0 && (
                <div className="space-y-2">
                  <Label>Team members to invite</Label>
                  <div className="space-y-2">
                    {invites.map((invite) => (
                      <div
                        key={invite.email}
                        className="flex items-center justify-between bg-muted p-2 rounded-md"
                      >
                        <div>
                          <span className="text-sm">{invite.email}</span>
                          <span className="text-xs text-muted-foreground ml-2 capitalize">
                            ({invite.role})
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeInvite(invite.email)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Kitchen Renovation - 123 Main St"
                />
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          {step > 1 ? (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={loading}
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            {step === 2 && (
              <Button variant="ghost" onClick={handleSkipInvites} disabled={loading}>
                Skip
              </Button>
            )}
            {step === 3 && (
              <Button variant="ghost" onClick={handleSkipProject} disabled={loading}>
                Skip
              </Button>
            )}

            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={loading}>
                Continue
              </Button>
            ) : (
              <Button onClick={handleCompleteOnboarding} disabled={loading}>
                {loading ? "Completing..." : "Complete Setup"}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
