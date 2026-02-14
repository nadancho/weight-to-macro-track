"use client";

import { useInitialAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const initialAuth = useInitialAuth();
  const [authenticated, setAuthenticated] = useState(initialAuth);
  const [authResolved, setAuthResolved] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/profile", { credentials: "include" })
      .then((r) => {
        setAuthenticated(r.ok);
        setAuthResolved(true);
      })
      .catch(() => {
        setAuthenticated(false);
        setAuthResolved(true);
      });
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Sign in failed");
      return;
    }
    setAuthenticated(true);
    router.refresh();
  };

  // Trust server auth so logged-in users never see sign-in flash; only show sign-in once client has resolved and user is not authenticated
  const showWelcome = authenticated;
  const showSignIn = authResolved && !authenticated;

  if (showWelcome) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Welcome</h1>
        <p className="text-muted-foreground">
          Track your weight and macros. Use the nav to log a day, view history, or update your profile.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/log">Log today</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/history">View history</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!showSignIn) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <p className="text-sm text-muted-foreground">
          Use your email and PIN to sign in.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">PIN</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/sign-up" className="font-medium text-foreground underline underline-offset-4">
              Sign up
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
