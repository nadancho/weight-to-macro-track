"use client";

import { usePathname } from "next/navigation";
import { BarChart2, History, PenLine, Trophy, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ROUTE_META: Record<string, { title: string; icon: LucideIcon }> = {
  "/": { title: "Log", icon: PenLine },
  "/history": { title: "History", icon: History },
  "/dashboard": { title: "Dashboard", icon: BarChart2 },
  "/collection": { title: "Badges", icon: Trophy },
  "/profile": { title: "Profile", icon: User },
};

export function PageHeader() {
  const pathname = usePathname();
  const meta = ROUTE_META[pathname] ?? ROUTE_META["/"];
  const Icon = meta.icon;

  return (
    <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
      <Icon className="h-5 w-5" aria-hidden />
      {meta.title}
    </div>
  );
}
