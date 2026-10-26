"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { BookOpen, CreditCard, Crown, FileText, Home, LogOut, MoreHorizontal, Radio, Settings, Shield, Trophy, Users } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ThemeChoice } from "@/components/shared/theme-choice";
import { useAnyLive } from "@/hooks/use-live-data";

const TABS = [
  { href: "/dashboard", label: "Home", icon: Home, match: (p: string) => p === "/dashboard" },
  { href: "/brackets", label: "Brackets", icon: FileText, match: (p: string) => p.startsWith("/brackets") },
  { href: "/game-center", label: "Live", icon: Radio, match: (p: string) => p.startsWith("/game-center") },
  { href: "/leaderboard", label: "Standings", icon: Trophy, match: (p: string) => p.startsWith("/leaderboard") },
];

// Hidden while picking so the picker's own controls own the bottom of the screen
const PICKER_ROUTES = [/^\/brackets\/new/, /^\/brackets\/[^/]+\/edit/];
export const isPickerRoute = (pathname: string) => PICKER_ROUTES.some((r) => r.test(pathname));

/** Bottom navigation on phones (replaces the hamburger menu) */
export function MobileTabBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const anyLive = useAnyLive(!!session);
  const [moreOpen, setMoreOpen] = useState(false);
  if (!session || isPickerRoute(pathname)) return null;

  const moreActive = ["/settings", "/payment", "/admin", "/hall-of-fame"].some((p) => pathname.startsWith(p));
  const moreLinks = [
    { href: "/hall-of-fame", label: "Hall of Fame", icon: Crown },
    { href: "/settings", label: "Settings", icon: Settings },
    { href: "/settings/family", label: "Family members", icon: Users },
    { href: "/payment", label: "Pay entry fee", icon: CreditCard },
    { href: "/dashboard#rules", label: "Rules & scoring", icon: BookOpen },
    ...(session.user.role === "ADMIN" ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
        aria-label="Main"
      >
        <div className="grid grid-cols-5 px-1 pt-1.5 pb-1">
          {TABS.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link key={href} href={href} className="flex flex-col items-center gap-0.5 py-1" aria-current={active ? "page" : undefined}>
                <span className={cn("relative flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-secondary")}>
                  <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} strokeWidth={active ? 2.4 : 2} />
                  {href === "/game-center" && anyLive && (
                    <span className="absolute top-0.5 right-2.5 h-2 w-2 animate-pulse rounded-full bg-red-600 ring-2 ring-background" aria-label="Games live" />
                  )}
                </span>
                <span className={cn("text-[11px]", active ? "font-semibold text-primary" : "text-muted-foreground")}>{label}</span>
              </Link>
            );
          })}
          <button type="button" onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-0.5 py-1">
            <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", moreActive && "bg-secondary")}>
              <MoreHorizontal className={cn("h-5 w-5", moreActive ? "text-primary" : "text-muted-foreground")} />
            </span>
            <span className={cn("text-[11px]", moreActive ? "font-semibold text-primary" : "text-muted-foreground")}>More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <SheetHeader className="text-left">
            <SheetTitle>{session.user.name ?? "Account"}</SheetTitle>
            <SheetDescription>{session.user.email}</SheetDescription>
          </SheetHeader>
          <div className="mt-2 divide-y px-4">
            {moreLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setMoreOpen(false)} className="flex items-center gap-3 py-3.5 text-[15px] font-medium">
                <Icon className="h-5 w-5 text-muted-foreground" />
                {label}
              </Link>
            ))}
            <div className="py-3">
              <ThemeChoice />
            </div>
            <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="flex w-full items-center gap-3 py-3.5 text-[15px] font-medium text-red-600">
              <LogOut className="h-5 w-5" />
              Log out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
