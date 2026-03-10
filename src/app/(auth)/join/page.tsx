"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

function JoinPoolContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [autoJoining, setAutoJoining] = useState(false);

  // Auto-fill invite code from URL param
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setInviteCode(code.toUpperCase());
    }
  }, [searchParams]);

  // Auto-join if user just authenticated and has a code
  useEffect(() => {
    const code = searchParams.get("code");
    if (session && code && !autoJoining) {
      setAutoJoining(true);
      handleAutoJoin(code.toUpperCase());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, searchParams]);

  const handleAutoJoin = async (code: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/pools/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.error?.includes("already a member")) {
          toast.success("You're already in the pool!");
          router.push("/dashboard");
        } else {
          toast.error(data.error || "Failed to join pool");
        }
      } else {
        toast.success(`Joined ${data.poolName || "the pool"}!`);
        router.push("/dashboard");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
      setAutoJoining(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      const joinUrl = `/join?code=${inviteCode}`;
      router.push(`/register?callbackUrl=${encodeURIComponent(joinUrl)}`);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/pools/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode.toUpperCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to join pool");
        return;
      }

      toast.success("Successfully joined the pool!");
      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-4">
            <Trophy className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">
              Pick<span className="text-primary">N</span>Roll
            </span>
          </Link>
          <div className="mx-auto w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Join a Pool</CardTitle>
          <CardDescription>
            Enter the invite code shared by your pool admin
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {!session && status !== "loading" && (
              <div className="bg-accent border border-primary/20 rounded-lg p-3 text-sm">
                <p className="font-medium text-foreground mb-1">How it works:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground text-xs">
                  <li>Enter the invite code below</li>
                  <li>Create an account (or sign in)</li>
                  <li>You&apos;ll be automatically added to the pool!</li>
                </ol>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite Code</Label>
              <Input
                id="inviteCode"
                type="text"
                placeholder="XXXX-XXXX"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                required
                disabled={isLoading}
                className="text-center text-2xl tracking-widest font-mono"
                maxLength={9}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isLoading || inviteCode.length < 4}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join Pool"
              )}
            </Button>
            {!session && status !== "loading" && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  Don&apos;t have an account?{" "}
                  <Link href={`/register?callbackUrl=${encodeURIComponent(`/join${inviteCode ? `?code=${inviteCode}` : ""}`)}`} className="text-primary hover:underline font-medium">
                    Sign up
                  </Link>
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  Already have an account?{" "}
                  <Link href={`/login?callbackUrl=${encodeURIComponent(`/join${inviteCode ? `?code=${inviteCode}` : ""}`)}`} className="text-primary hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function JoinPoolPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <JoinPoolContent />
    </Suspense>
  );
}
