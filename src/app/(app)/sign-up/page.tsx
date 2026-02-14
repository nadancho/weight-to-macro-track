"use client";

import { useInitialAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SignUpPage() {
  const router = useRouter();
  const initialAuth = useInitialAuth();
  const [authenticated, setAuthenticated] = useState(initialAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/profile", { credentials: "include" })
      .then((r) => setAuthenticated(r.ok))
      .catch(() => setAuthenticated(false));
  }, []);

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

  if (authenticated) {
    router.replace("/");
    return (
      <p className="text-muted-foreground">Redirecting…</p>
    );
  }

  if (success) {
    return (
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>Account created</CardTitle>
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
    );
  }

  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Sign up</CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter your email and choose a PIN (at least 6 characters).
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
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">PIN</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/" className="font-medium text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
