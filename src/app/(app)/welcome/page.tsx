"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TreePine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function WelcomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const trimmed = name.trim();
  const valid = trimmed.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ display_name: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }

      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <TreePine className="size-12 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome to the grove
        </h1>
        <p className="text-muted-foreground text-sm max-w-xs">
          Before we get started, what should we call you?
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-4">
        <Input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          maxLength={50}
          className="min-h-[44px] text-center text-lg"
        />

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <Button
          type="submit"
          disabled={!valid || saving}
          className="min-h-[44px]"
        >
          {saving ? "Saving..." : "Continue"}
        </Button>
      </form>
    </div>
  );
}
