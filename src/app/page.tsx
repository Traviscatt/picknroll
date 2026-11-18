import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Navbar } from "@/components/shared/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FINAL_FOUR_BONUS, MAX_POSSIBLE_SCORE } from "@/lib/scoring";
import { scoringGroups } from "@/components/shared/scoring-rules";
import { Trophy, Users, Zap, DollarSign, ChevronRight, Target, Award, Radio, Crown } from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  // No database access here: the landing page must not wake the (auto-paused) database for anonymous visitors.
  // The next tournament is in March; after the season ends (May onward) that's next year.
  const now = new Date();
  const tournamentYear = now.getMonth() >= 4 ? now.getFullYear() + 1 : now.getFullYear();

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent via-transparent to-transparent opacity-60" />
        <div className="container relative mx-auto px-4 py-20 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-primary">
              <Trophy className="h-4 w-4" />
              NCAA Tournament {tournamentYear}
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
              Make Every Pick{" "}
              <span className="text-primary">
                Count
              </span>
            </h1>
            <p className="mb-8 text-xl text-muted-foreground md:text-2xl">
              Pick<span className="font-bold text-primary">N</span>Roll
            </p>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
              The ultimate NCAA Tournament bracket pool with our unique multi-choice
              scoring system. Hedge your bets, maximize your points, and dominate
              your pool.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="h-14 px-8 text-lg bg-primary hover:bg-primary/90"
                asChild
              >
                <Link href="/join">
                  Join a Pool
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg" asChild>
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Scoring Section */}
      <section className="py-20 bg-primary dark:bg-brand-forest">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-white">
              Our Unique Multi-Choice Scoring System
            </h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              Don&apos;t just pick winners—rank your confidence! Later rounds let you
              hedge your bets with multiple choices.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {scoringGroups().map((group, i) => (
              <Card key={group.label} className={`bg-white/10 border-white/20 ${i === 2 ? "md:col-span-2 lg:col-span-1" : ""}`}>
                <CardContent className="p-6">
                  <div className="text-brand-gold font-bold text-sm mb-2 uppercase">{group.label}</div>
                  <h3 className="text-xl font-semibold mb-2 text-white">{group.title}</h3>
                  <p className="text-white/60 text-sm mb-4">{group.detail}</p>
                  <div className="space-y-2 text-sm">
                    {group.rules.map((rule) => (
                      <div key={rule.round} className="flex justify-between text-white/80">
                        <span>{rule.roundName}</span>
                        <span>
                          <span className="text-brand-gold font-semibold">{rule.pointsPerChoice[0]}</span>
                          {rule.pointsPerChoice.slice(1).map((p) => `/${p}`).join("")} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <p className="text-white/70">
              Maximum possible points:{" "}
              <span className="text-brand-gold font-bold text-2xl">{MAX_POSSIBLE_SCORE}</span>
              <span className="block text-sm text-white/50 mt-1">
                Includes a +{FINAL_FOUR_BONUS} bonus for picking all four Final Four teams as your 1st choice
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-foreground">
              Everything You Need to Run Your Pool
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From bracket submission to automatic scoring, we&apos;ve got you covered.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="flex flex-col items-center text-center p-6">
              <div className="h-14 w-14 rounded-full bg-accent flex items-center justify-center mb-4">
                <Target className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Bracket Entry</h3>
              <p className="text-muted-foreground">
                Intuitive interface to make your picks online. Region by region,
                round by round.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="h-14 w-14 rounded-full bg-accent flex items-center justify-center mb-4">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Family Brackets</h3>
              <p className="text-muted-foreground">
                Create brackets for family members who don&apos;t want to manage
                their own account.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="h-14 w-14 rounded-full bg-accent flex items-center justify-center mb-4">
                <Zap className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Auto Scoring</h3>
              <p className="text-muted-foreground">
                Connected to live game data. Scores update automatically as
                games finish.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="h-14 w-14 rounded-full bg-accent flex items-center justify-center mb-4">
                <DollarSign className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Payments</h3>
              <p className="text-muted-foreground">
                Collect entry fees via PayPal or Venmo. Track who&apos;s paid at a
                glance.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="h-14 w-14 rounded-full bg-accent flex items-center justify-center mb-4">
                <Radio className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Game Center</h3>
              <p className="text-muted-foreground">
                Live scores next to your picks, live standings, and a rooting
                guide for every game.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="h-14 w-14 rounded-full bg-accent flex items-center justify-center mb-4">
                <Crown className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Hall of Fame</h3>
              <p className="text-muted-foreground">
                Every season&apos;s champion and podium, plus all-time
                bragging rights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary dark:bg-brand-forest">
        <div className="container mx-auto px-4 text-center">
          <Award className="h-16 w-16 text-white/80 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Dominate Your Pool?
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
            Entry fee and deadline are set by your pool admin. Picks lock at the first tip-off.
          </p>
          <div className="flex items-center justify-center">
            <Button
              size="lg"
              className="h-14 px-8 text-lg bg-card text-primary hover:bg-secondary"
              asChild
            >
              <Link href="/join">Join a Pool</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-forest text-white/60 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Trophy className="h-6 w-6 text-brand-gold" />
              <span className="text-xl font-bold text-white">
                Pick<span className="text-brand-gold">N</span>Roll
              </span>
            </div>
            <p className="text-sm">
              © {new Date().getFullYear()} Pick N Roll. Make Every Pick Count.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
