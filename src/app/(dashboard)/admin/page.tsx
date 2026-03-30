"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users,
  Trophy,
  DollarSign,
  FileText,
  BarChart3,
  CheckCircle,
  Clock,
  AlertCircle,
  Megaphone,
  Bell,
  Loader2,
  MessageSquare,
  Search,
  Dices,
  ChevronDown,
  ChevronUp,
  Medal,
} from "lucide-react";
import { toast } from "sonner";

interface UserForNotification {
  id: string;
  name: string;
  email: string;
}

interface ScenarioOutcome {
  round: number;
  region: string | null;
  team1: string;
  team2: string;
  winner: string;
}

interface ScenarioEntry {
  rank: number;
  name: string;
  entryName: string;
  combined: number;
  bonusScore: number;
}

interface Scenario {
  scenarioIndex: number;
  outcomes: ScenarioOutcome[];
  top10: ScenarioEntry[];
}

interface RemainingGame {
  id: string;
  round: number;
  gameNumber: number;
  region: string | null;
  team1: { name: string };
  team2: { name: string };
}

interface ScenariosData {
  remainingGames: RemainingGame[];
  totalScenarios: number;
  scenarios: Scenario[];
  message?: string;
}

interface DashboardStats {
  totalBrackets: number;
  paidBrackets: number;
  unpaidBrackets: number;
  draftBrackets: number;
  totalUsers: number;
  prizePool: number;
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalBrackets: 0,
    paidBrackets: 0,
    unpaidBrackets: 0,
    draftBrackets: 0,
    totalUsers: 0,
    prizePool: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [sendingPaymentReminder, setSendingPaymentReminder] = useState(false);
  const [sendingDeadlineReminder, setSendingDeadlineReminder] = useState(false);
  
  // Custom notification state
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<UserForNotification[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sendingCustom, setSendingCustom] = useState(false);
  const [sendEmailWithCustom, setSendEmailWithCustom] = useState(true);

  // Scenarios state
  const [scenariosOpen, setScenariosOpen] = useState(false);
  const [scenariosData, setScenariosData] = useState<ScenariosData | null>(null);
  const [scenariosLoading, setScenariosLoading] = useState(false);
  const [expandedScenario, setExpandedScenario] = useState<number | null>(null);

  const fetchUsers = async () => {
    if (allUsers.length > 0) return;
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const filteredUsers = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const sendCustomNotification = async () => {
    if (!customTitle.trim() || !customMessage.trim()) {
      toast.error("Title and message are required");
      return;
    }
    if (!sendToAll && selectedUserIds.length === 0) {
      toast.error("Select at least one recipient");
      return;
    }

    setSendingCustom(true);
    try {
      const res = await fetch("/api/admin/notifications/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: customTitle,
          message: customMessage,
          sendToAll,
          userIds: sendToAll ? undefined : selectedUserIds,
          sendEmail: sendEmailWithCustom,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Notification sent to ${data.notified} users`);
        setCustomDialogOpen(false);
        setCustomTitle("");
        setCustomMessage("");
        setSelectedUserIds([]);
        setSendToAll(true);
      } else {
        toast.error(data.error || "Failed to send notification");
      }
    } catch {
      toast.error("Failed to send notification");
    } finally {
      setSendingCustom(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/admin/stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchStats();
    }
  }, [session]);

  if (status === "loading" || isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!session) return null;

  const adminLinks = [
    {
      title: "Manage Brackets",
      description: "View all brackets, mark as paid, adjust scores",
      icon: FileText,
      href: "/admin/brackets",
      color: "bg-blue-500",
    },
    {
      title: "Manage Pools",
      description: "Create, edit, and manage pools and settings",
      icon: Users,
      href: "/admin/pools",
      color: "bg-green-500",
    },
    {
      title: "Enter Results",
      description: "Input game scores to calculate points",
      icon: Trophy,
      href: "/admin/results",
      color: "bg-primary",
    },
    {
      title: "Manage Users",
      description: "View users, toggle admin privileges",
      icon: Users,
      href: "/admin/users",
      color: "bg-purple-500",
    },
    {
      title: "Announcements",
      description: "Post messages to all participants",
      icon: Megaphone,
      href: "/admin/announcements",
      color: "bg-pink-500",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-600 mt-1">
          Manage your bracket pool
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Brackets</CardTitle>
            <FileText className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBrackets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Entries</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paidBrackets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Entries</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.unpaidBrackets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <FileText className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-500">{stats.draftBrackets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prize Pool</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${stats.prizePool.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {adminLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${link.color}`}>
                      <link.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{link.title}</CardTitle>
                      <CardDescription>{link.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Payment Status Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Paid</span>
              <div className="flex items-center gap-2">
                <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{
                      width: `${stats.totalBrackets > 0 ? (stats.paidBrackets / stats.totalBrackets) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">
                  {stats.totalBrackets > 0
                    ? Math.round((stats.paidBrackets / stats.totalBrackets) * 100)
                    : 0}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Unpaid</span>
              <div className="flex items-center gap-2">
                <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 rounded-full"
                    style={{
                      width: `${stats.totalBrackets > 0 ? (stats.unpaidBrackets / stats.totalBrackets) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">
                  {stats.totalBrackets > 0
                    ? Math.round((stats.unpaidBrackets / stats.totalBrackets) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </div>

          {stats.unpaidBrackets > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  {stats.unpaidBrackets} unpaid {stats.unpaidBrackets === 1 ? "entry" : "entries"}
                </p>
                <p className="text-xs text-yellow-700">
                  Consider sending payment reminders before the deadline.
                </p>
              </div>
            </div>
          )}
          {stats.draftBrackets > 0 && (
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2">
              <FileText className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {stats.draftBrackets} unsubmitted {stats.draftBrackets === 1 ? "draft" : "drafts"}
                </p>
                <p className="text-xs text-slate-600">
                  These brackets haven&apos;t been submitted yet.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Send Notifications
          </CardTitle>
          <CardDescription>
            Send email and in-app notifications to pool members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              disabled={sendingPaymentReminder || stats.unpaidBrackets === 0}
              onClick={async () => {
                setSendingPaymentReminder(true);
                try {
                  const res = await fetch("/api/admin/notifications/payment-reminder", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({}),
                  });
                  const data = await res.json();
                  if (res.ok) {
                    toast.success(`Payment reminders sent to ${data.sent} users`);
                  } else {
                    toast.error(data.error || "Failed to send reminders");
                  }
                } catch {
                  toast.error("Failed to send payment reminders");
                } finally {
                  setSendingPaymentReminder(false);
                }
              }}
            >
              {sendingPaymentReminder ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4 mr-2" />
              )}
              Send Payment Reminders
              {stats.unpaidBrackets > 0 && (
                <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                  {stats.unpaidBrackets}
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              disabled={sendingDeadlineReminder}
              onClick={async () => {
                setSendingDeadlineReminder(true);
                try {
                  const res = await fetch("/api/admin/notifications/deadline-reminder", {
                    method: "POST",
                  });
                  const data = await res.json();
                  if (res.ok) {
                    toast.success(`Deadline reminders sent to ${data.sent} users`);
                  } else {
                    toast.error(data.error || "Failed to send reminders");
                  }
                } catch {
                  toast.error("Failed to send deadline reminders");
                } finally {
                  setSendingDeadlineReminder(false);
                }
              }}
            >
              {sendingDeadlineReminder ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Clock className="h-4 w-4 mr-2" />
              )}
              Send Deadline Reminders
            </Button>

            <Dialog open={customDialogOpen} onOpenChange={(open) => {
              setCustomDialogOpen(open);
              if (open) fetchUsers();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Custom Notification
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Send Custom Notification</DialogTitle>
                  <DialogDescription>
                    Send a custom message to all users or selected recipients
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="notif-title">Title</Label>
                    <Input
                      id="notif-title"
                      placeholder="Notification title"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notif-message">Message</Label>
                    <Textarea
                      id="notif-message"
                      placeholder="Your message..."
                      rows={4}
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="send-email"
                      checked={sendEmailWithCustom}
                      onCheckedChange={(checked) => setSendEmailWithCustom(checked === true)}
                    />
                    <Label htmlFor="send-email" className="text-sm font-normal">
                      Also send via email
                    </Label>
                  </div>
                  <div className="space-y-3">
                    <Label>Recipients</Label>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="send-all"
                          checked={sendToAll}
                          onCheckedChange={(checked) => setSendToAll(checked === true)}
                        />
                        <Label htmlFor="send-all" className="text-sm font-normal">
                          All Members ({allUsers.length})
                        </Label>
                      </div>
                    </div>
                    {!sendToAll && (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            placeholder="Search users..."
                            className="pl-9"
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                          />
                        </div>
                        <ScrollArea className="h-48 border rounded-md p-2">
                          {loadingUsers ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                            </div>
                          ) : filteredUsers.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">
                              No users found
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {filteredUsers.map((user) => (
                                <div
                                  key={user.id}
                                  className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                                  onClick={() => toggleUserSelection(user.id)}
                                >
                                  <Checkbox
                                    checked={selectedUserIds.includes(user.id)}
                                    onCheckedChange={() => toggleUserSelection(user.id)}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{user.name}</p>
                                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                        {selectedUserIds.length > 0 && (
                          <p className="text-xs text-slate-600">
                            {selectedUserIds.length} user{selectedUserIds.length !== 1 ? "s" : ""} selected
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCustomDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={sendCustomNotification} disabled={sendingCustom}>
                    {sendingCustom ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4 mr-2" />
                    )}
                    Send Notification
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Notifications are sent via email and appear in the bell icon for each user.
          </p>
        </CardContent>
      </Card>

      {/* Outcome Scenarios */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={async () => {
            const opening = !scenariosOpen;
            setScenariosOpen(opening);
            if (opening && !scenariosData) {
              setScenariosLoading(true);
              try {
                const res = await fetch("/api/admin/scenarios");
                if (res.ok) {
                  const data = await res.json();
                  setScenariosData(data);
                } else {
                  toast.error("Failed to load scenarios");
                }
              } catch {
                toast.error("Failed to load scenarios");
              } finally {
                setScenariosLoading(false);
              }
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dices className="h-5 w-5" />
              <div>
                <CardTitle>Outcome Scenarios</CardTitle>
                <CardDescription>
                  See the top 10 leaderboard for every possible remaining-game outcome
                </CardDescription>
              </div>
            </div>
            {scenariosOpen ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </div>
        </CardHeader>
        {scenariosOpen && (
          <CardContent>
            {scenariosLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                <span className="ml-2 text-sm text-slate-500">Computing all scenarios...</span>
              </div>
            ) : scenariosData?.message ? (
              <p className="text-sm text-slate-500 py-4">{scenariosData.message}</p>
            ) : scenariosData ? (
              <div className="space-y-4">
                {/* Remaining Games Summary */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    {scenariosData.remainingGames.length} remaining game{scenariosData.remainingGames.length !== 1 ? "s" : ""} &middot; {scenariosData.totalScenarios} possible outcomes
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {scenariosData.remainingGames.map((g) => (
                      <span key={g.id} className="text-xs bg-white border rounded-full px-3 py-1 text-slate-600">
                        R{g.round}: {g.team1.name} vs {g.team2.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Scenario Cards */}
                <div className="space-y-2">
                  {scenariosData.scenarios.map((scenario) => (
                    <div key={scenario.scenarioIndex} className="border rounded-lg overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors text-left"
                        onClick={() =>
                          setExpandedScenario(
                            expandedScenario === scenario.scenarioIndex ? null : scenario.scenarioIndex
                          )
                        }
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold bg-slate-200 text-slate-700 rounded px-2 py-0.5">
                            #{scenario.scenarioIndex}
                          </span>
                          {scenario.outcomes.map((o, i) => (
                            <span key={i} className="text-xs bg-slate-100 text-slate-700 font-medium rounded-full px-2 py-0.5">
                              <span className={o.winner === o.team1 ? "text-primary font-bold" : ""}>{o.team1}</span>
                              {" vs "}
                              <span className={o.winner === o.team2 ? "text-primary font-bold" : ""}>{o.team2}</span>
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-slate-500">
                            1st: {scenario.top10[0]?.entryName || "—"} ({scenario.top10[0]?.combined || 0}pts)
                          </span>
                          {expandedScenario === scenario.scenarioIndex ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </button>
                      {expandedScenario === scenario.scenarioIndex && (
                        <div className="border-t bg-white">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-slate-50 text-slate-500">
                                <th className="text-left px-3 py-2 font-medium w-12">#</th>
                                <th className="text-left px-3 py-2 font-medium">Bracket</th>
                                <th className="text-left px-3 py-2 font-medium">Entry</th>
                                <th className="text-right px-3 py-2 font-medium">Score</th>
                                <th className="text-right px-3 py-2 font-medium">Bonus</th>
                                <th className="text-right px-3 py-2 font-medium">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {scenario.top10.map((entry) => (
                                <tr key={entry.rank} className="border-b last:border-b-0 hover:bg-slate-50">
                                  <td className="px-3 py-2">
                                    <div className="flex items-center">
                                      {entry.rank <= 3 ? (
                                        <Medal className={`h-4 w-4 ${
                                          entry.rank === 1 ? "text-yellow-500" :
                                          entry.rank === 2 ? "text-slate-400" :
                                          "text-amber-600"
                                        }`} />
                                      ) : (
                                        <span className="text-slate-500">{entry.rank}</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 font-medium truncate max-w-[200px]">{entry.name}</td>
                                  <td className="px-3 py-2 text-slate-600 truncate max-w-[150px]">{entry.entryName}</td>
                                  <td className="px-3 py-2 text-right tabular-nums">{entry.combined - entry.bonusScore}</td>
                                  <td className="px-3 py-2 text-right tabular-nums">
                                    {entry.bonusScore > 0 ? (
                                      <span className="text-green-600">+{entry.bonusScore}</span>
                                    ) : (
                                      <span className="text-slate-300">0</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right font-bold tabular-nums">{entry.combined}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
