import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Navbar } from "@/components/shared/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Trophy,
  Users,
  Zap,
  Upload,
  DollarSign,
  ChevronRight,
  Target,
  Award,
  TrendingUp,
} from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-100 via-transparent to-transparent opacity-60" />
        <div className="container relative mx-auto px-4 py-20 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-sm font-medium text-orange-700">
              <Trophy className="h-4 w-4" />
              NCAA Tournament 2026
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-slate-900 md:text-6xl lg:text-7xl">
              From Bracket to{" "}
              <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                Bankroll
              </span>
            </h1>
            <p className="mb-8 text-xl text-slate-600 md:text-2xl">
              Pick<span className="font-bold text-orange-500">N</span>Roll!
            </p>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-600">
              The ultimate NCAA Tournament bracket pool with our unique multi-choice
              scoring system. Hedge your bets, maximize your points, and dominate
              your pool.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="h-14 px-8 text-lg bg-orange-500 hover:bg-orange-600"
                asChild
              >
                <Link href="/join">
                  Join a Pool
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Scoring Section */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Our Unique Multi-Choice Scoring System
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Don&apos;t just pick winners—rank your confidence! Later rounds let you
              hedge your bets with multiple choices.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="text-orange-500 font-bold text-sm mb-2">
                  ROUNDS 1 & 2
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">
                  Traditional Picks
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  Pick one winner per game
                </p>
                <div className="flex items-center gap-4">
                  <div className="bg-slate-700 rounded-lg px-3 py-2">
                    <span className="text-2xl font-bold text-orange-500">2</span>
                    <span className="text-slate-400 text-sm ml-1">pts</span>
                  </div>
                  <div className="bg-slate-700 rounded-lg px-3 py-2">
                    <span className="text-2xl font-bold text-orange-500">5</span>
                    <span className="text-slate-400 text-sm ml-1">pts</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="text-orange-500 font-bold text-sm mb-2">
                  SWEET 16 & ELITE 8
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">
                  Multi-Choice Picks
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  Rank 2-3 teams per game
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-300">
                    <span>Sweet 16:</span>
                    <span>
                      <span className="text-orange-500 font-semibold">10</span>/5 pts
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Elite 8:</span>
                    <span>
                      <span className="text-orange-500 font-semibold">15</span>/10/5 pts
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700 md:col-span-2 lg:col-span-1">
              <CardContent className="p-6">
                <div className="text-orange-500 font-bold text-sm mb-2">
                  FINAL FOUR & CHAMPIONSHIP
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">
                  Maximum Hedging
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  Rank 4-5 teams for big points
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-300">
                    <span>Final Four:</span>
                    <span>
                      <span className="text-orange-500 font-semibold">25</span>/15/10/5
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Championship:</span>
                    <span>
                      <span className="text-orange-500 font-semibold">35</span>/25/15/10/5
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="text-center mt-8">
            <p className="text-slate-400">
              Maximum possible points:{" "}
              <span className="text-orange-500 font-bold text-2xl">369</span>
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-slate-900">
              Everything You Need to Run Your Pool
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              From bracket submission to automatic scoring, we&apos;ve got you covered.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="flex flex-col items-center text-center p-6">
              <div className="h-14 w-14 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                <Target className="h-7 w-7 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Bracket Entry</h3>
              <p className="text-slate-600">
                Intuitive interface to make your picks online. Region by region,
                round by round.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="h-14 w-14 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                <Upload className="h-7 w-7 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Bracket Upload</h3>
              <p className="text-slate-600">
                Upload a photo of your filled bracket and let AI extract your
                picks automatically.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="h-14 w-14 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                <Zap className="h-7 w-7 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Auto Scoring</h3>
              <p className="text-slate-600">
                Connected to live game data. Scores update automatically as
                games finish.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="h-14 w-14 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                <Users className="h-7 w-7 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Invite Codes</h3>
              <p className="text-slate-600">
                Share a simple code to invite friends. No complex setup required.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="h-14 w-14 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                <DollarSign className="h-7 w-7 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Payments</h3>
              <p className="text-slate-600">
                Collect entry fees via PayPal or Venmo. Track who&apos;s paid at a
                glance.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="h-14 w-14 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                <TrendingUp className="h-7 w-7 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Live Leaderboard</h3>
              <p className="text-slate-600">
                Real-time standings. See how you stack up against the
                competition.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-orange-500">
        <div className="container mx-auto px-4 text-center">
          <Award className="h-16 w-16 text-white/80 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Dominate Your Pool?
          </h2>
          <p className="text-orange-100 text-lg mb-8 max-w-xl mx-auto">
            Entry fee: <span className="font-bold text-white">$5.00</span> •
            Deadline: Thursday at Noon (Before Tipoff)
          </p>
          <div className="flex items-center justify-center">
            <Button
              size="lg"
              className="h-14 px-8 text-lg bg-white text-orange-500 hover:bg-orange-50"
              asChild
            >
              <Link href="/join">Join a Pool</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Trophy className="h-6 w-6 text-orange-500" />
              <span className="text-xl font-bold text-white">
                Pick<span className="text-orange-500">N</span>Roll
              </span>
            </div>
            <p className="text-sm">
              © {new Date().getFullYear()} Pick N Roll. From Bracket to Bankroll!
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
