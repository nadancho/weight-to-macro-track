"use client";

import { useInitialAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Profile = {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const initialAuth = useInitialAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authOk, setAuthOk] = useState(initialAuth);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/profile", { credentials: "include" });
    setAuthOk(res.ok);
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setDisplayName(data.display_name ?? "");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSignOut = async () => {
    await fetch("/api/auth/sign-out", { method: "POST", credentials: "include" });
    setProfile(null);
    setAuthOk(false);
    router.push("/");
    router.refresh();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ display_name: displayName || null }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setDisplayName(data.display_name ?? "");
      router.refresh();
    }
  };

  if (!authOk) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">You need to sign in to view profile.</p>
        <Button asChild>
          <Link href="/">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <Card className="max-w-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Profile</CardTitle>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display_name">Display name</Label>
            <Input
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </form>
        {profile && (
          <p className="text-xs text-muted-foreground">
            Member since {new Date(profile.created_at).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
