"use client";

import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { ADMIN_UUID } from "@/app/lib/constants";
import { BarChart2, History, PenLine, Shield, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

interface Tab {
  href: string;
  icon: LucideIcon;
  label: string;
  adminOnly?: boolean;
}

const tabs: Tab[] = [
  { href: "/", icon: PenLine, label: "Log" },
  { href: "/history", icon: History, label: "History" },
  { href: "/dashboard", icon: BarChart2, label: "Dashboard" },
  { href: "/profile", icon: User, label: "Profile" },
  { href: "/admin", icon: Shield, label: "Admin", adminOnly: true },
];

/** Nav content height (excludes safe area). Matches min-h on tab items. */
export const NAV_HEIGHT = 48;

export function BottomNav() {
  const pathname = usePathname();
  const { userId } = useAuth();
  const isAdmin = userId === ADMIN_UUID;

  const visibleTabs = isAdmin ? tabs : tabs.filter((t) => !t.adminOnly);

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 sm:hidden",
        "border-t border-border bg-background"
      )}
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        ["--bottom-nav-height" as string]: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
      } as React.CSSProperties}
    >
      <div className="mx-auto flex max-w-4xl items-center justify-around">
        {visibleTabs.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[64px] min-h-[48px] transition-[colors,transform] duration-75 active:scale-95",
                active
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <Icon className="size-5" aria-hidden />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
