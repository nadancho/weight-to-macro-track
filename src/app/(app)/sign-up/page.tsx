"use client";

import { AuthLoadingSkeleton, useAuth } from "@/components/auth-provider";
import { PinInput } from "@/components/ui/pin-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignUpPage() {
  const router = useRouter();
  const { authResolved, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Sign up failed");
      return;
    }
    setSuccess(true);
  };

  if (!authResolved) {
    return <AuthLoadingSkeleton />;
  }

  if (isAuthenticated) {
    router.replace("/");
    return (
      <p className="text-muted-foreground">Redirecting…</p>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[60vh] py-8">
        <Card className="max-w-sm w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl">
              Account created
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Sign in with your email and PIN to continue.
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pinComplete = password.length === 6;

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[60vh] py-8">
      <Card className="max-w-sm w-full">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <UserRoundPlus className="size-8 shrink-0" aria-hidden />
            Sign up
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your email and choose a 6-digit PIN.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>PIN (6 digits)</Label>
              <PinInput
                value={password}
                onChange={setPassword}
                disabled={loading}
                aria-label="PIN, 6 digits"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {pinComplete && (
              <Button type="submit" className="w-full" disabled={loading}>
                <UserRoundPlus className="size-4 shrink-0" aria-hidden />
                {loading ? "Creating account…" : "Create account"}
              </Button>
            )}
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/" className="font-medium text-foreground underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
