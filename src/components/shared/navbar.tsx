"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, Trophy, User, LogOut, Settings, Shield, Sun, Moon } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-orange-500" />
            <span className="text-xl font-bold">
              Pick<span className="text-orange-500">N</span>Roll
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-4">
            {session && (
              <>
                <Link
                  href="/dashboard"
                  className={`text-sm font-medium transition-colors ${isActive("/dashboard") ? "text-orange-500" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/brackets"
                  className={`text-sm font-medium transition-colors ${isActive("/brackets") ? "text-orange-500" : "text-muted-foreground hover:text-foreground"}`}
                >
                  My Brackets
                </Link>
                <Link
                  href="/leaderboard"
                  className={`text-sm font-medium transition-colors ${isActive("/leaderboard") ? "text-orange-500" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Leaderboard
                </Link>
                {session.user?.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className={`text-sm font-medium transition-colors ${isActive("/admin") ? "text-orange-500" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Admin
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          {status === "loading" ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : session ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-orange-500 text-white">
                        {getInitials(session.user?.name || "U")}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{session.user?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.user?.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  {session.user?.role === "ADMIN" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-red-600"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile menu */}
              <Sheet>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px]">
                  <div className="flex flex-col gap-4 mt-8">
                    <Link
                      href="/dashboard"
                      className={`text-lg font-medium transition-colors ${isActive("/dashboard") ? "text-orange-500" : "hover:text-orange-500"}`}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/brackets"
                      className={`text-lg font-medium transition-colors ${isActive("/brackets") ? "text-orange-500" : "hover:text-orange-500"}`}
                    >
                      My Brackets
                    </Link>
                    <Link
                      href="/leaderboard"
                      className={`text-lg font-medium transition-colors ${isActive("/leaderboard") ? "text-orange-500" : "hover:text-orange-500"}`}
                    >
                      Leaderboard
                    </Link>
                    {session.user?.role === "ADMIN" && (
                      <Link
                        href="/admin"
                        className={`text-lg font-medium transition-colors ${isActive("/admin") ? "text-orange-500" : "hover:text-orange-500"}`}
                      >
                        Admin
                      </Link>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild className="bg-orange-500 hover:bg-orange-600">
                <Link href="/register">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
