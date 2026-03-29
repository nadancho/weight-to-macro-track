import { AuthProvider } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { LogCacheProvider } from "@/components/log-cache-provider";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { WoodlandThemeProvider } from "@/components/woodland-theme-provider";
import { BarChart2, History, Home, PenLine, Trophy, User } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/app/lib/modules/auth";
import { getProfile } from "@/app/lib/modules/profiles";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const profile = session ? await getProfile() : null;
  const initialTheme = (profile as { theme?: string } | null)?.theme ?? "cottagecore";
  return (
    <AuthProvider initialAuth={!!session}>
    <WoodlandThemeProvider initialThemeId={initialTheme}>
    <LogCacheProvider>
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>
      <header
        className="sticky top-0 z-50 border-b border-white/[0.1] bg-background/60 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
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
                href="/collection"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                <Trophy className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Badges</span>
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
      <main id="main-content" className="mx-auto max-w-4xl px-4 py-6 pb-24 sm:pb-6">{children}</main>
      <BottomNav />
      <PwaInstallPrompt />
    </div>
    </LogCacheProvider>
    </WoodlandThemeProvider>
    </AuthProvider>
  );
}
