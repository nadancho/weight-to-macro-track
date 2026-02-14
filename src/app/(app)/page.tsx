"use client";

import { AuthLoadingSkeleton, useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { History, LogIn, PenLine } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const { authResolved, isAuthenticated, setAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    setAuth(true);
    router.refresh();
  };

  const showWelcome = isAuthenticated;
  const showSignIn = authResolved && !isAuthenticated;

  if (showWelcome) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Welcome</h1>
        <p className="text-muted-foreground">
          Track your weight and macros. Use the nav to log a day, view history, or update your profile.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/log">
              <PenLine className="size-4 shrink-0" aria-hidden />
              Log today
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/history">
              <History className="size-4 shrink-0" aria-hidden />
              View history
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!showSignIn) {
    return <AuthLoadingSkeleton />;
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
            <LogIn className="size-4 shrink-0" aria-hidden />
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
