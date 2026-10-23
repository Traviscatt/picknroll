// One-off (Phase 3): fill in the 2026 tournament's new fields and move pool payment details out of the env.
// - Team.school / colors / logos and TournamentTeam.record from the saved ESPN 2026 data, using the
//   hand-tuned names and pre-tournament records the picker used to hardcode.
// - Tournament.regions = bracket order (Final Four: East–South, West–Midwest).
// - Pools: paypalLink / venmoHandle from the former NEXT_PUBLIC_* values when empty.
// Games, scores, and picks are not touched (the tournament is locked, so publishField refuses matchup changes).
//
// Run with the database tunnel open (`npx sst tunnel --stage <stage>`):
//   npx sst shell --target Prisma --stage <stage> -- node scripts/run-ts.mjs scripts/backfill-2026-field.ts          (dry run)
//   npx sst shell --target Prisma --stage <stage> -- node scripts/run-ts.mjs scripts/backfill-2026-field.ts --apply
import { db } from "@/lib/db";
import { parseEspnField } from "@/lib/espn-field";
import { publishField, publishSchema } from "@/lib/tournament-import";
import fixture from "@/lib/__tests__/fixtures/espn-2026-field.json";

const LEGACY: Record<string, [string, string | null]> = {
  "East-1": ["Duke", "32-2"], "East-2": ["UConn", "29-5"], "East-3": ["Michigan State", "25-7"], "East-4": ["Kansas", "23-10"],
  "East-5": ["St. John's", "28-6"], "East-6": ["Louisville", "23-10"], "East-7": ["UCLA", "23-11"], "East-8": ["Ohio State", "21-12"],
  "East-9": ["TCU", "22-11"], "East-10": ["UCF", "21-11"], "East-11": ["South Florida", "25-8"], "East-12": ["Northern Iowa", "23-12"],
  "East-13": ["Cal Baptist", "25-8"], "East-14": ["North Dakota State", "27-7"], "East-15": ["Furman", "22-12"], "East-16": ["Siena", "23-11"],
  "South-1": ["Florida", "26-7"], "South-2": ["Houston", "28-6"], "South-3": ["Illinois", "24-8"], "South-4": ["Nebraska", "26-6"],
  "South-5": ["Vanderbilt", "26-8"], "South-6": ["North Carolina", "24-8"], "South-7": ["Saint Mary's", "27-5"], "South-8": ["Clemson", "24-10"],
  "South-9": ["Iowa", "21-12"], "South-10": ["Texas A&M", "21-11"], "South-11": ["VCU", "27-7"], "South-12": ["McNeese", "28-5"],
  "South-13": ["Troy", "22-11"], "South-14": ["Penn", "18-11"], "South-15": ["Idaho", "21-14"],
  "West-1": ["Arizona", "32-2"], "West-2": ["Purdue", "27-8"], "West-3": ["Gonzaga", "30-3"], "West-4": ["Arkansas", "26-8"],
  "West-5": ["Wisconsin", "24-10"], "West-6": ["BYU", "23-11"], "West-7": ["Miami (FL)", "25-8"], "West-8": ["Villanova", "24-8"],
  "West-9": ["Utah State", "28-6"], "West-10": ["Missouri", "20-12"], "West-12": ["High Point", "30-4"], "West-13": ["Hawaii", "24-8"],
  "West-14": ["Kennesaw State", "21-13"], "West-15": ["Queens", "21-13"], "West-16": ["LIU", "24-10"],
  "Midwest-1": ["Michigan", "31-3"], "Midwest-2": ["Iowa State", "27-7"], "Midwest-3": ["Virginia", "29-5"], "Midwest-4": ["Alabama", "23-9"],
  "Midwest-5": ["Texas Tech", "22-10"], "Midwest-6": ["Tennessee", "22-11"], "Midwest-7": ["Kentucky", "21-13"], "Midwest-8": ["Georgia", "22-10"],
  "Midwest-9": ["Saint Louis", "28-5"], "Midwest-10": ["Santa Clara", "26-8"], "Midwest-12": ["Akron", "29-5"], "Midwest-13": ["Hofstra", "24-10"],
  "Midwest-14": ["Wright State", "23-11"], "Midwest-15": ["Tennessee State", "23-9"],
  // First Four slots (South-16, West-11, Midwest-11, Midwest-16) keep ESPN's winner name and record
};
const PAYMENT = { paypalLink: "https://paypal.me/Traviscatt", venmoHandle: "Traviscatt" };

async function main() {
  const apply = process.argv.includes("--apply");
  const parsed = parseEspnField(fixture.events);
  if (parsed.problems.length) throw new Error(`ESPN data problems: ${parsed.problems.join("; ")}`);

  const tournament = await db.tournament.findFirst({ where: { year: 2026 }, include: { teams: { include: { team: true } } } });
  if (!tournament) throw new Error("No 2026 tournament in this database");

  for (const slot of parsed.slots) {
    const legacy = LEGACY[`${slot.region}-${slot.seed}`];
    if (legacy) [slot.team.school, slot.team.record] = legacy;
  }

  // Report what changes (and confirm every slot keeps its team)
  let mismatches = 0;
  for (const slot of parsed.slots) {
    const current = tournament.teams.find((t) => t.region === slot.region && t.seed === slot.seed);
    if (current?.team.espnId !== slot.team.espnId) {
      mismatches++;
      console.log(`  ! ${slot.region} ${slot.seed}: DB has ${current?.team.espnId ?? "nothing"} (${current?.team.name}), ESPN has ${slot.team.espnId} (${slot.team.name})`);
    } else if (current.team.school !== slot.team.school || current.record !== slot.team.record) {
      console.log(`  ${slot.region.padEnd(7)} ${String(slot.seed).padStart(2)}  ${current.team.name.padEnd(30)} school: ${current.team.school ?? "-"} → ${slot.team.school}   record: ${current.record ?? "-"} → ${slot.team.record ?? "-"}`);
    }
  }
  if (mismatches) throw new Error(`${mismatches} slot(s) don't match; stopping.`);

  const input = publishSchema.parse({
    year: 2026,
    name: tournament.name,
    regions: parsed.regions,
    startDate: new Date(parsed.firstRoundTipoff!).toISOString(),
    slots: parsed.slots,
    r1GameIds: parsed.r1GameIds,
  });
  console.log(`Tournament "${tournament.name}": regions ${tournament.regions.join(",") || "(unset)"} → ${input.regions.join(",")}`);

  const pools = await db.pool.findMany({ where: { tournamentId: tournament.id } });
  for (const pool of pools) {
    console.log(`Pool "${pool.name}": entryFee ${pool.entryFee}, paypalLink ${pool.paypalLink ?? "(empty)"}, venmoHandle ${pool.venmoHandle ?? "(empty)"}`);
  }

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to write.");
    return;
  }

  const result = await publishField(input);
  console.log("Published:", result);
  for (const pool of pools) {
    const data = { paypalLink: pool.paypalLink || PAYMENT.paypalLink, venmoHandle: pool.venmoHandle || PAYMENT.venmoHandle };
    await db.pool.update({ where: { id: pool.id }, data });
    console.log(`Pool "${pool.name}" payment:`, data);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
