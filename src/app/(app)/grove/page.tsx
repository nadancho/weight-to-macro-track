"use client";

import { AuthLoadingSkeleton, useAuth } from "@/components/auth-provider";
import { SpriteAnimator } from "@/components/sprite-animator";
import { ADMIN_UUID } from "@/app/lib/constants";
import { TreePine, LogIn } from "lucide-react";
import Link from "next/link";

export default function GrovePage() {
  const { authResolved, isAuthenticated, userId } = useAuth();

  if (!authResolved) return <AuthLoadingSkeleton />;

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-muted-foreground">Sign in to visit the grove.</p>
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

  if (userId !== ADMIN_UUID) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
        <TreePine className="size-16 text-muted-foreground/30" aria-hidden />
        <div>
          <h1 className="text-xl font-bold">The Grove</h1>
          <p className="text-muted-foreground mt-1">Coming soon</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <TreePine className="size-6" aria-hidden />
          The Grove
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your woodland clearing
        </p>
      </div>

      {/* Grassland scene */}
      <div
        className="relative w-full overflow-hidden rounded-xl border border-border"
        style={{
          height: 360,
          background:
            "linear-gradient(180deg, hsl(200 40% 65%) 0%, hsl(200 50% 75%) 35%, hsl(120 30% 55%) 35%, hsl(120 35% 45%) 100%)",
        }}
      >
        {/* Ground texture hint */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: "65%",
            background:
              "repeating-linear-gradient(90deg, transparent, transparent 8px, hsl(120 30% 50% / 0.15) 8px, hsl(120 30% 50% / 0.15) 9px)",
          }}
        />

        {/* Tyson */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
          <SpriteAnimator
            src="/sprites/tyson-idle-3x3.png"
            grid={[3, 3]}
            frames={[1, 3, 4, 6, 7]}
            frameSize={96}
            width={128}
            height={128}
            fps={6}
          />
        </div>

        {/* Title overlay */}
        <div className="absolute top-4 left-4">
          <span
            className="text-xs font-bold uppercase tracking-widest text-white/70"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
          >
            The Grove
          </span>
        </div>
      </div>
    </div>
  );
}
