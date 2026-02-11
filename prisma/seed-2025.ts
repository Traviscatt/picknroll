import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// 2025 NCAA Tournament Teams by Region with ESPN IDs
const REGIONS = {
  South: [
    { espnId: "2", name: "Auburn Tigers", short: "AUB", seed: 1 },
    { espnId: "127", name: "Michigan State Spartans", short: "MSU", seed: 2 },
    { espnId: "66", name: "Iowa State Cyclones", short: "ISU", seed: 3 },
    { espnId: "245", name: "Texas A&M Aggies", short: "TA&M", seed: 4 },
    { espnId: "130", name: "Michigan Wolverines", short: "MICH", seed: 5 },
    { espnId: "145", name: "Ole Miss Rebels", short: "MISS", seed: 6 },
    { espnId: "269", name: "Marquette Golden Eagles", short: "MARQ", seed: 7 },
    { espnId: "97", name: "Louisville Cardinals", short: "LOU", seed: 8 },
    { espnId: "156", name: "Creighton Bluejays", short: "CREI", seed: 9 },
    { espnId: "167", name: "New Mexico Lobos", short: "UNM", seed: 10 },
    { espnId: "153", name: "North Carolina Tar Heels", short: "UNC", seed: 11 },
    { espnId: "28", name: "UC San Diego Tritons", short: "UCSD", seed: 12 },
    { espnId: "43", name: "Yale Bulldogs", short: "YALE", seed: 13 },
    { espnId: "288", name: "Lipscomb Bisons", short: "LIP", seed: 14 },
    { espnId: "2803", name: "Bryant Bulldogs", short: "BRY", seed: 15 },
    { espnId: "2011", name: "Alabama State Hornets", short: "ALST", seed: 16 },
  ],
  East: [
    { espnId: "150", name: "Duke Blue Devils", short: "DUKE", seed: 1 },
    { espnId: "333", name: "Alabama Crimson Tide", short: "ALA", seed: 2 },
    { espnId: "275", name: "Wisconsin Badgers", short: "WIS", seed: 3 },
    { espnId: "12", name: "Arizona Wildcats", short: "ARIZ", seed: 4 },
    { espnId: "2483", name: "Oregon Ducks", short: "ORE", seed: 5 },
    { espnId: "252", name: "BYU Cougars", short: "BYU", seed: 6 },
    { espnId: "2608", name: "Saint Mary's Gaels", short: "SMC", seed: 7 },
    { espnId: "344", name: "Mississippi State Bulldogs", short: "MSST", seed: 8 },
    { espnId: "239", name: "Baylor Bears", short: "BAY", seed: 9 },
    { espnId: "238", name: "Vanderbilt Commodores", short: "VAN", seed: 10 },
    { espnId: "2670", name: "VCU Rams", short: "VCU", seed: 11 },
    { espnId: "2335", name: "Liberty Flames", short: "LIB", seed: 12 },
    { espnId: "2006", name: "Akron Zips", short: "AKR", seed: 13 },
    { espnId: "149", name: "Montana Grizzlies", short: "MONT", seed: 14 },
    { espnId: "2523", name: "Robert Morris Colonials", short: "RMU", seed: 15 },
    { espnId: "116", name: "Mount St. Mary's Mountaineers", short: "MSM", seed: 16 },
  ],
  West: [
    { espnId: "57", name: "Florida Gators", short: "FLA", seed: 1 },
    { espnId: "2599", name: "St. John's Red Storm", short: "SJU", seed: 2 },
    { espnId: "2641", name: "Texas Tech Red Raiders", short: "TTU", seed: 3 },
    { espnId: "120", name: "Maryland Terrapins", short: "MD", seed: 4 },
    { espnId: "235", name: "Memphis Tigers", short: "MEM", seed: 5 },
    { espnId: "142", name: "Missouri Tigers", short: "MIZ", seed: 6 },
    { espnId: "2305", name: "Kansas Jayhawks", short: "KU", seed: 7 },
    { espnId: "41", name: "UConn Huskies", short: "CONN", seed: 8 },
    { espnId: "201", name: "Oklahoma Sooners", short: "OU", seed: 9 },
    { espnId: "8", name: "Arkansas Razorbacks", short: "ARK", seed: 10 },
    { espnId: "2181", name: "Drake Bulldogs", short: "DRKE", seed: 11 },
    { espnId: "36", name: "Colorado State Rams", short: "CSU", seed: 12 },
    { espnId: "2253", name: "Grand Canyon Lopes", short: "GCU", seed: 13 },
    { espnId: "350", name: "UNC Wilmington Seahawks", short: "UNCW", seed: 14 },
    { espnId: "2437", name: "Omaha Mavericks", short: "OMA", seed: 15 },
    { espnId: "2450", name: "Norfolk State Spartans", short: "NORF", seed: 16 },
  ],
  Midwest: [
    { espnId: "248", name: "Houston Cougars", short: "HOU", seed: 1 },
    { espnId: "2633", name: "Tennessee Volunteers", short: "TENN", seed: 2 },
    { espnId: "96", name: "Kentucky Wildcats", short: "UK", seed: 3 },
    { espnId: "2509", name: "Purdue Boilermakers", short: "PUR", seed: 4 },
    { espnId: "228", name: "Clemson Tigers", short: "CLEM", seed: 5 },
    { espnId: "356", name: "Illinois Fighting Illini", short: "ILL", seed: 6 },
    { espnId: "26", name: "UCLA Bruins", short: "UCLA", seed: 7 },
    { espnId: "2250", name: "Gonzaga Bulldogs", short: "GONZ", seed: 8 },
    { espnId: "61", name: "Georgia Bulldogs", short: "UGA", seed: 9 },
    { espnId: "328", name: "Utah State Aggies", short: "USU", seed: 10 },
    { espnId: "2752", name: "Xavier Musketeers", short: "XAV", seed: 11 },
    { espnId: "2377", name: "McNeese Cowboys", short: "MCN", seed: 12 },
    { espnId: "2272", name: "High Point Panthers", short: "HPU", seed: 13 },
    { espnId: "2653", name: "Troy Trojans", short: "TROY", seed: 14 },
    { espnId: "2747", name: "Wofford Terriers", short: "WOF", seed: 15 },
    { espnId: "2565", name: "SIU Edwardsville Cougars", short: "SIUE", seed: 16 },
  ],
};

// Actual game results by region/round with winner ESPN ID and scores
interface GameResult {
  region: string;
  round: number;
  gameNumber: number;
  team1EspnId: string;
  team2EspnId: string;
  winnerEspnId: string;
  team1Score: number;
  team2Score: number;
}

const GAME_RESULTS: GameResult[] = [
  // === ROUND 1 (32 games: South 1-8, East 9-16, West 17-24, Midwest 25-32) ===
  // South Region
  { region: "South", round: 1, gameNumber: 1, team1EspnId: "2", team2EspnId: "2011", winnerEspnId: "2", team1Score: 83, team2Score: 63 },
  { region: "South", round: 1, gameNumber: 2, team1EspnId: "97", team2EspnId: "156", winnerEspnId: "156", team1Score: 75, team2Score: 89 },
  { region: "South", round: 1, gameNumber: 3, team1EspnId: "130", team2EspnId: "28", winnerEspnId: "130", team1Score: 68, team2Score: 65 },
  { region: "South", round: 1, gameNumber: 4, team1EspnId: "245", team2EspnId: "43", winnerEspnId: "245", team1Score: 80, team2Score: 71 },
  { region: "South", round: 1, gameNumber: 5, team1EspnId: "145", team2EspnId: "153", winnerEspnId: "145", team1Score: 71, team2Score: 64 },
  { region: "South", round: 1, gameNumber: 6, team1EspnId: "66", team2EspnId: "288", winnerEspnId: "66", team1Score: 82, team2Score: 55 },
  { region: "South", round: 1, gameNumber: 7, team1EspnId: "269", team2EspnId: "167", winnerEspnId: "167", team1Score: 66, team2Score: 75 },
  { region: "South", round: 1, gameNumber: 8, team1EspnId: "127", team2EspnId: "2803", winnerEspnId: "127", team1Score: 87, team2Score: 62 },
  // East Region
  { region: "East", round: 1, gameNumber: 9, team1EspnId: "150", team2EspnId: "116", winnerEspnId: "150", team1Score: 93, team2Score: 49 },
  { region: "East", round: 1, gameNumber: 10, team1EspnId: "344", team2EspnId: "239", winnerEspnId: "239", team1Score: 72, team2Score: 75 },
  { region: "East", round: 1, gameNumber: 11, team1EspnId: "2483", team2EspnId: "2335", winnerEspnId: "2483", team1Score: 81, team2Score: 52 },
  { region: "East", round: 1, gameNumber: 12, team1EspnId: "12", team2EspnId: "2006", winnerEspnId: "12", team1Score: 93, team2Score: 65 },
  { region: "East", round: 1, gameNumber: 13, team1EspnId: "252", team2EspnId: "2670", winnerEspnId: "252", team1Score: 80, team2Score: 71 },
  { region: "East", round: 1, gameNumber: 14, team1EspnId: "275", team2EspnId: "149", winnerEspnId: "275", team1Score: 85, team2Score: 66 },
  { region: "East", round: 1, gameNumber: 15, team1EspnId: "2608", team2EspnId: "238", winnerEspnId: "2608", team1Score: 59, team2Score: 56 },
  { region: "East", round: 1, gameNumber: 16, team1EspnId: "333", team2EspnId: "2523", winnerEspnId: "333", team1Score: 90, team2Score: 81 },
  // West Region
  { region: "West", round: 1, gameNumber: 17, team1EspnId: "57", team2EspnId: "2450", winnerEspnId: "57", team1Score: 95, team2Score: 69 },
  { region: "West", round: 1, gameNumber: 18, team1EspnId: "41", team2EspnId: "201", winnerEspnId: "41", team1Score: 67, team2Score: 59 },
  { region: "West", round: 1, gameNumber: 19, team1EspnId: "235", team2EspnId: "36", winnerEspnId: "36", team1Score: 70, team2Score: 78 },
  { region: "West", round: 1, gameNumber: 20, team1EspnId: "120", team2EspnId: "2253", winnerEspnId: "120", team1Score: 81, team2Score: 49 },
  { region: "West", round: 1, gameNumber: 21, team1EspnId: "142", team2EspnId: "2181", winnerEspnId: "2181", team1Score: 57, team2Score: 67 },
  { region: "West", round: 1, gameNumber: 22, team1EspnId: "2641", team2EspnId: "350", winnerEspnId: "2641", team1Score: 82, team2Score: 72 },
  { region: "West", round: 1, gameNumber: 23, team1EspnId: "2305", team2EspnId: "8", winnerEspnId: "8", team1Score: 72, team2Score: 79 },
  { region: "West", round: 1, gameNumber: 24, team1EspnId: "2599", team2EspnId: "2437", winnerEspnId: "2599", team1Score: 83, team2Score: 53 },
  // Midwest Region
  { region: "Midwest", round: 1, gameNumber: 25, team1EspnId: "248", team2EspnId: "2565", winnerEspnId: "248", team1Score: 78, team2Score: 40 },
  { region: "Midwest", round: 1, gameNumber: 26, team1EspnId: "2250", team2EspnId: "61", winnerEspnId: "2250", team1Score: 89, team2Score: 68 },
  { region: "Midwest", round: 1, gameNumber: 27, team1EspnId: "228", team2EspnId: "2377", winnerEspnId: "2377", team1Score: 67, team2Score: 69 },
  { region: "Midwest", round: 1, gameNumber: 28, team1EspnId: "2509", team2EspnId: "2272", winnerEspnId: "2509", team1Score: 75, team2Score: 63 },
  { region: "Midwest", round: 1, gameNumber: 29, team1EspnId: "356", team2EspnId: "2752", winnerEspnId: "356", team1Score: 86, team2Score: 73 },
  { region: "Midwest", round: 1, gameNumber: 30, team1EspnId: "96", team2EspnId: "2653", winnerEspnId: "96", team1Score: 76, team2Score: 57 },
  { region: "Midwest", round: 1, gameNumber: 31, team1EspnId: "26", team2EspnId: "328", winnerEspnId: "26", team1Score: 72, team2Score: 47 },
  { region: "Midwest", round: 1, gameNumber: 32, team1EspnId: "2633", team2EspnId: "2747", winnerEspnId: "2633", team1Score: 77, team2Score: 62 },

  // === ROUND 2 (16 games: South 1-4, East 5-8, West 9-12, Midwest 13-16) ===
  { region: "South", round: 2, gameNumber: 1, team1EspnId: "2", team2EspnId: "156", winnerEspnId: "2", team1Score: 82, team2Score: 70 },
  { region: "South", round: 2, gameNumber: 2, team1EspnId: "245", team2EspnId: "130", winnerEspnId: "130", team1Score: 79, team2Score: 91 },
  { region: "South", round: 2, gameNumber: 3, team1EspnId: "66", team2EspnId: "145", winnerEspnId: "145", team1Score: 78, team2Score: 91 },
  { region: "South", round: 2, gameNumber: 4, team1EspnId: "127", team2EspnId: "167", winnerEspnId: "127", team1Score: 71, team2Score: 63 },
  { region: "East", round: 2, gameNumber: 5, team1EspnId: "150", team2EspnId: "239", winnerEspnId: "150", team1Score: 89, team2Score: 66 },
  { region: "East", round: 2, gameNumber: 6, team1EspnId: "12", team2EspnId: "2483", winnerEspnId: "12", team1Score: 87, team2Score: 83 },
  { region: "East", round: 2, gameNumber: 7, team1EspnId: "275", team2EspnId: "252", winnerEspnId: "252", team1Score: 89, team2Score: 91 },
  { region: "East", round: 2, gameNumber: 8, team1EspnId: "333", team2EspnId: "2608", winnerEspnId: "333", team1Score: 80, team2Score: 66 },
  { region: "West", round: 2, gameNumber: 9, team1EspnId: "57", team2EspnId: "41", winnerEspnId: "57", team1Score: 77, team2Score: 75 },
  { region: "West", round: 2, gameNumber: 10, team1EspnId: "120", team2EspnId: "36", winnerEspnId: "120", team1Score: 72, team2Score: 71 },
  { region: "West", round: 2, gameNumber: 11, team1EspnId: "2641", team2EspnId: "2181", winnerEspnId: "2641", team1Score: 77, team2Score: 64 },
  { region: "West", round: 2, gameNumber: 12, team1EspnId: "2599", team2EspnId: "8", winnerEspnId: "8", team1Score: 66, team2Score: 75 },
  { region: "Midwest", round: 2, gameNumber: 13, team1EspnId: "248", team2EspnId: "2250", winnerEspnId: "248", team1Score: 81, team2Score: 76 },
  { region: "Midwest", round: 2, gameNumber: 14, team1EspnId: "2509", team2EspnId: "2377", winnerEspnId: "2509", team1Score: 76, team2Score: 62 },
  { region: "Midwest", round: 2, gameNumber: 15, team1EspnId: "96", team2EspnId: "356", winnerEspnId: "96", team1Score: 84, team2Score: 75 },
  { region: "Midwest", round: 2, gameNumber: 16, team1EspnId: "2633", team2EspnId: "26", winnerEspnId: "2633", team1Score: 67, team2Score: 58 },

  // === SWEET 16 (Round 3, 8 games: South 1-2, East 3-4, West 5-6, Midwest 7-8) ===
  { region: "South", round: 3, gameNumber: 1, team1EspnId: "2", team2EspnId: "130", winnerEspnId: "2", team1Score: 78, team2Score: 65 },
  { region: "South", round: 3, gameNumber: 2, team1EspnId: "127", team2EspnId: "145", winnerEspnId: "127", team1Score: 73, team2Score: 70 },
  { region: "East", round: 3, gameNumber: 3, team1EspnId: "150", team2EspnId: "12", winnerEspnId: "150", team1Score: 100, team2Score: 93 },
  { region: "East", round: 3, gameNumber: 4, team1EspnId: "333", team2EspnId: "252", winnerEspnId: "333", team1Score: 113, team2Score: 88 },
  { region: "West", round: 3, gameNumber: 5, team1EspnId: "57", team2EspnId: "120", winnerEspnId: "57", team1Score: 87, team2Score: 71 },
  { region: "West", round: 3, gameNumber: 6, team1EspnId: "2641", team2EspnId: "8", winnerEspnId: "2641", team1Score: 85, team2Score: 83 },
  { region: "Midwest", round: 3, gameNumber: 7, team1EspnId: "248", team2EspnId: "2509", winnerEspnId: "248", team1Score: 62, team2Score: 60 },
  { region: "Midwest", round: 3, gameNumber: 8, team1EspnId: "2633", team2EspnId: "96", winnerEspnId: "2633", team1Score: 78, team2Score: 65 },

  // === ELITE 8 (Round 4, 4 games: South 1, East 2, West 3, Midwest 4) ===
  { region: "South", round: 4, gameNumber: 1, team1EspnId: "2", team2EspnId: "127", winnerEspnId: "2", team1Score: 70, team2Score: 64 },
  { region: "East", round: 4, gameNumber: 2, team1EspnId: "150", team2EspnId: "333", winnerEspnId: "150", team1Score: 85, team2Score: 65 },
  { region: "West", round: 4, gameNumber: 3, team1EspnId: "57", team2EspnId: "2641", winnerEspnId: "57", team1Score: 84, team2Score: 79 },
  { region: "Midwest", round: 4, gameNumber: 4, team1EspnId: "248", team2EspnId: "2633", winnerEspnId: "248", team1Score: 69, team2Score: 50 },

  // === FINAL FOUR (Round 5) ===
  { region: "Final Four", round: 5, gameNumber: 1, team1EspnId: "2", team2EspnId: "57", winnerEspnId: "57", team1Score: 73, team2Score: 79 },
  { region: "Final Four", round: 5, gameNumber: 2, team1EspnId: "150", team2EspnId: "248", winnerEspnId: "248", team1Score: 67, team2Score: 70 },

  // === CHAMPIONSHIP (Round 6) ===
  { region: "Championship", round: 6, gameNumber: 1, team1EspnId: "248", team2EspnId: "57", winnerEspnId: "57", team1Score: 63, team2Score: 65 },
];

async function seed() {
  console.log("🏀 Seeding 2025 NCAA Tournament data...\n");

  // 1. Create Tournament
  const tournament = await db.tournament.create({
    data: {
      name: "2025 NCAA Men's Basketball Tournament",
      year: 2025,
      startDate: new Date("2025-03-20"),
      endDate: new Date("2025-04-07"),
    },
  });
  console.log("✅ Created tournament:", tournament.name);

  // 2. Create Teams and TournamentTeams
  const teamMap = new Map<string, string>(); // espnId -> tournamentTeamId

  for (const [region, teams] of Object.entries(REGIONS)) {
    for (const teamData of teams) {
      // Create or find team
      let team = await db.team.findUnique({ where: { espnId: teamData.espnId } });
      if (!team) {
        team = await db.team.create({
          data: {
            name: teamData.name,
            shortName: teamData.short,
            espnId: teamData.espnId,
          },
        });
      }

      // Create TournamentTeam
      const tournamentTeam = await db.tournamentTeam.create({
        data: {
          seed: teamData.seed,
          region,
          teamId: team.id,
          tournamentId: tournament.id,
        },
      });

      teamMap.set(teamData.espnId, tournamentTeam.id);
    }
  }
  console.log(`✅ Created ${teamMap.size} teams across 4 regions`);

  // 3. Create Games with Results
  let gamesCreated = 0;
  for (const result of GAME_RESULTS) {
    const team1TournamentId = teamMap.get(result.team1EspnId);
    const team2TournamentId = teamMap.get(result.team2EspnId);
    const winnerTournamentId = teamMap.get(result.winnerEspnId);

    if (!team1TournamentId || !team2TournamentId || !winnerTournamentId) {
      console.error(`❌ Missing team mapping for game: ${result.region} R${result.round} G${result.gameNumber}`);
      continue;
    }

    await db.game.create({
      data: {
        round: result.round,
        gameNumber: result.gameNumber,
        region: result.round <= 4 ? result.region : (result.round === 5 ? "Final Four" : "Championship"),
        status: "FINAL",
        team1Id: team1TournamentId,
        team2Id: team2TournamentId,
        winnerId: winnerTournamentId,
        team1Score: result.team1Score,
        team2Score: result.team2Score,
        tournamentId: tournament.id,
      },
    });
    gamesCreated++;
  }
  console.log(`✅ Created ${gamesCreated} games with results`);

  // 4. Create a Pool for testing
  const adminUser = await db.user.findFirst({ where: { role: "ADMIN" } });
  if (adminUser) {
    const pool = await db.pool.create({
      data: {
        name: "2025 March Madness Pool",
        description: "Pick N Roll bracket challenge",
        entryFee: 5.00,
        inviteCode: "PICKNROLL2025",
        deadline: new Date("2025-03-20T12:00:00Z"),
        status: "OPEN",
        tournamentId: tournament.id,
      },
    });

    await db.poolMember.create({
      data: {
        userId: adminUser.id,
        poolId: pool.id,
        role: "ADMIN",
        paid: true,
      },
    });

    // Update existing brackets to belong to this pool
    await db.bracket.updateMany({
      where: { poolId: null },
      data: { poolId: pool.id },
    });

    console.log(`✅ Created pool: ${pool.name} (invite code: ${pool.inviteCode})`);
  }

  console.log("\n🎉 Seed complete! You can now:");
  console.log("   1. Create/submit a bracket on the live site");
  console.log("   2. Go to Admin → Results to see all games");
  console.log("   3. Click 'Recalculate Scores' to test scoring");
  console.log("   4. Check the Leaderboard to verify scores");
}

seed()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
