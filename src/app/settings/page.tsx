"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface UserPreferences {
  name: string | null;
  email: string;
  digestEnabled: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    try {
      const res = await fetch("/api/trpc/userSettings.getPreferences");
      const data = await res.json();
      if (data?.result?.data) {
        setPreferences(data.result.data);
        setName(data.result.data.name || "");
        setDigestEnabled(data.result.data.digestEnabled);
      }
    } catch (err) {
      console.error("Failed to load preferences:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/trpc/userSettings.updatePreferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: {
            name: name || undefined,
            digestEnabled,
          },
        }),
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error.message || "Failed to save preferences");
        return;
      }

      setPreferences(data.result.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert("Failed to save preferences");
    } finally {
      setSaving(false);
    }
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
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      <div className="flex gap-4 border-b pb-4">
        <Link
          href="/settings"
          className="px-4 py-2 text-sm font-medium border-b-2 border-primary"
        >
          Account
        </Link>
        <Link
          href="/settings/team"
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Team
        </Link>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your account information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={preferences?.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed. Contact support if needed.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Configure how you receive updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="digest">Daily Digest Email</Label>
              <p className="text-sm text-muted-foreground">
                Receive a daily summary of upcoming tasks and permit deadlines
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="digest"
                className="sr-only peer"
                checked={digestEnabled}
                onChange={(e) => setDigestEnabled(e.target.checked)}
              />
              <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          {digestEnabled && (
            <p className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
              You&apos;ll receive digest emails at 07:00 UTC with:
              <br />- Tasks due within the next 3 days
              <br />- Permit deadlines within the next 7 days
            </p>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
        {saved && (
          <span className="text-sm text-green-600">Preferences saved!</span>
        )}
      </div>
    </div>
  );
}
