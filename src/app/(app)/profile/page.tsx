"use client";

import { AuthLoadingSkeleton, useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PinInput } from "@/components/ui/pin-input";
import { KeyRound, LogIn, LogOut, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const PIN_LENGTH = 6;

type Profile = {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const { authResolved, isAuthenticated, setAuth } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinResetLoading, setPinResetLoading] = useState(false);
  const [pinResetError, setPinResetError] = useState<string | null>(null);
  const [pinResetSuccess, setPinResetSuccess] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/profile", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setDisplayName(data.display_name ?? "");
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const handleSignOut = async () => {
    await fetch("/api/auth/sign-out", { method: "POST", credentials: "include" });
    setProfile(null);
    setAuth(false);
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

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinResetError(null);
    if (newPin !== confirmPin) {
      setPinResetError("PINs do not match");
      return;
    }
    if (newPin.length !== PIN_LENGTH) {
      setPinResetError(`PIN must be ${PIN_LENGTH} digits`);
      return;
    }
    setPinResetLoading(true);
    const res = await fetch("/api/auth/update-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password: newPin, confirm: confirmPin }),
    });
    const data = await res.json().catch(() => ({}));
    setPinResetLoading(false);
    if (res.ok) {
      setNewPin("");
      setConfirmPin("");
      setPinResetSuccess(true);
      setPinResetError(null);
      setTimeout(() => setPinResetSuccess(false), 3000);
    } else {
      setPinResetError(data.error ?? "Failed to update PIN");
    }
  };

  if (!authResolved) {
    return <AuthLoadingSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">You need to sign in to view profile.</p>
        <Button asChild>
          <Link href="/">
            <LogIn className="size-4 shrink-0" aria-hidden />
            Sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <Card className="max-w-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Profile</CardTitle>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          <LogOut className="size-4 shrink-0" aria-hidden />
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
            <Save className="size-4 shrink-0" aria-hidden />
            {saving ? "Saving…" : "Save"}
          </Button>
        </form>
        {profile && (
          <p className="text-xs text-muted-foreground">
            Member since {new Date(profile.created_at).toLocaleDateString()}
          </p>
        )}

        <hr className="border-border" />

        <form onSubmit={handleResetPin} className="space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <CardTitle className="text-lg">Reset PIN</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter a new {PIN_LENGTH}-digit PIN and confirm.
          </p>
          <div className="space-y-2">
            <Label>New PIN</Label>
            <PinInput
              value={newPin}
              onChange={setNewPin}
              disabled={pinResetLoading}
              length={PIN_LENGTH}
              aria-label={`New PIN, ${PIN_LENGTH} digits`}
            />
          </div>
          <div className="space-y-2">
            <Label>Confirm PIN</Label>
            <PinInput
              value={confirmPin}
              onChange={setConfirmPin}
              disabled={pinResetLoading}
              length={PIN_LENGTH}
              aria-label={`Confirm PIN, ${PIN_LENGTH} digits`}
            />
          </div>
          {pinResetError && (
            <p className="text-sm text-destructive" role="alert">
              {pinResetError}
            </p>
          )}
          {pinResetSuccess && (
            <p className="text-sm text-green-600 dark:text-green-500" role="status">
              PIN updated. Use it next time you sign in.
            </p>
          )}
          <Button
            type="submit"
            variant="secondary"
            disabled={
              pinResetLoading ||
              newPin.length !== PIN_LENGTH ||
              confirmPin.length !== PIN_LENGTH
            }
          >
            <KeyRound className="size-4 shrink-0" aria-hidden />
            {pinResetLoading ? "Updating…" : "Update PIN"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
