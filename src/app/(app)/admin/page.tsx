"use client";

import { useAuth } from "@/components/auth-provider";
import { ADMIN_UUID } from "@/app/lib/constants";
import { Database, Film, Layers, Shield } from "lucide-react";
import Link from "next/link";

const adminLinks = [
  {
    href: "/admin/animations",
    icon: Film,
    label: "Sprite Animations",
    description: "Manage creature animation sheets, frame sequences, and offsets",
  },
  {
    href: "/admin/encounter-sets",
    icon: Layers,
    label: "Encounter Sets",
    description: "Configure creature pools and conditions for the two-stage reveal system",
  },
  {
    href: "/admin/profile-attributes",
    icon: Database,
    label: "Profile Attributes",
    description: "Define computed user attributes used by encounter set conditions",
  },
] as const;

export default function AdminPage() {
  const { userId } = useAuth();

  if (userId !== ADMIN_UUID) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="size-6" aria-hidden />
          Admin
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Woodland management tools
        </p>
      </div>

      <div className="grid gap-3">
        {adminLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-4 rounded-2xl border border-white/[0.12] bg-white/[0.06] p-4 hover:bg-white/[0.1] transition-colors"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <link.icon className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{link.label}</p>
              <p className="text-sm text-muted-foreground">{link.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
