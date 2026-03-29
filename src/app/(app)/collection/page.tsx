"use client";

import { AuthLoadingSkeleton, useAuth } from "@/components/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { LogIn, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Badge = {
  id: string;
  name: string;
  description: string;
  image_path: string | null;
  kind: string;
  tags: string[];
  rarity: string;
};

type UserCollectible = {
  collectible_id: string;
  awarded_at: string;
  badge: Badge;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function badgeImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/badges/${imagePath}`;
}

const RARITY_STYLES: Record<string, string> = {
  common: "border-border",
  uncommon: "border-green-500/50 shadow-green-500/10",
  rare: "border-blue-500/50 shadow-blue-500/10",
  legendary: "border-amber-500/50 shadow-amber-500/10",
};

export default function CollectionPage() {
  const { authResolved, isAuthenticated } = useAuth();
  const [collectibles, setCollectibles] = useState<UserCollectible[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/collectibles", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setCollectibles)
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (!authResolved) return <AuthLoadingSkeleton />;

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-muted-foreground">Sign in to view your collection.</p>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <LogIn className="h-4 w-4" />
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Trophy className="size-6" aria-hidden />
          Badge Collection
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {collectibles.length === 0
            ? "No badges yet — keep logging!"
            : `${collectibles.length} badge${collectibles.length === 1 ? "" : "s"} earned`}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-skeleton animate-pulse"
            />
          ))}
        </div>
      ) : collectibles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Trophy className="size-12 text-muted-foreground/30 mb-4" aria-hidden />
            <p className="text-muted-foreground">
              Badges appear here as you log your meals and hit milestones.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {collectibles.map((c) => {
            const imgUrl = badgeImageUrl(c.badge.image_path);
            return (
              <Card
                key={c.collectible_id}
                className={cn(
                  "overflow-hidden border-2 transition-shadow hover:shadow-md",
                  RARITY_STYLES[c.badge.rarity] ?? RARITY_STYLES.common,
                )}
              >
                <CardContent className="p-3 flex flex-col items-center text-center gap-2">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={c.badge.name}
                      className="w-full aspect-square object-contain rounded-md"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full aspect-square rounded-md bg-muted flex items-center justify-center">
                      <Trophy className="size-10 text-muted-foreground/30" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold leading-tight">{c.badge.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {c.badge.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {format(new Date(c.awarded_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
