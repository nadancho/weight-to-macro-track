import { AuthProvider } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { DataCacheProvider } from "@/components/data-cache-provider";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { BarChart2, History, Home, PenLine, User } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/app/lib/modules/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  return (
    <AuthProvider initialAuth={!!session}>
    <DataCacheProvider>
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-white/[0.1] bg-background/60 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Home className="h-5 w-5" aria-hidden />
            Weight Tracker
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="hidden sm:flex items-center gap-1 sm:gap-2">
              <Link
                href="/"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                <PenLine className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Log</span>
              </Link>
              <Link
                href="/history"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                <History className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">History</span>
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                <BarChart2 className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                <User className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Profile</span>
              </Link>
            </div>
            <ThemeToggle />
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6 pb-24 sm:pb-6">{children}</main>
      <BottomNav />
      <PwaInstallPrompt />
    </div>
    </DataCacheProvider>
    </AuthProvider>
  );
}
