import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// 2026 NCAA Tournament Teams by Region with ESPN IDs (extracted from logo URLs)
const REGIONS = {
  East: [
    { espnId: "150", name: "Duke Blue Devils", short: "DUKE", seed: 1 },
    { espnId: "41", name: "UConn Huskies", short: "CONN", seed: 2 },
    { espnId: "127", name: "Michigan State Spartans", short: "MSU", seed: 3 },
    { espnId: "2305", name: "Kansas Jayhawks", short: "KU", seed: 4 },
    { espnId: "2599", name: "St. John's Red Storm", short: "SJU", seed: 5 },
    { espnId: "97", name: "Louisville Cardinals", short: "LOU", seed: 6 },
    { espnId: "26", name: "UCLA Bruins", short: "UCLA", seed: 7 },
    { espnId: "194", name: "Ohio State Buckeyes", short: "OSU", seed: 8 },
    { espnId: "2628", name: "TCU Horned Frogs", short: "TCU", seed: 9 },
    { espnId: "2116", name: "UCF Knights", short: "UCF", seed: 10 },
    { espnId: "58", name: "South Florida Bulls", short: "USF", seed: 11 },
    { espnId: "2460", name: "Northern Iowa Panthers", short: "UNI", seed: 12 },
    { espnId: "2856", name: "Cal Baptist Lancers", short: "CBU", seed: 13 },
    { espnId: "2449", name: "North Dakota State Bison", short: "NDSU", seed: 14 },
    { espnId: "231", name: "Furman Paladins", short: "FUR", seed: 15 },
    { espnId: "2561", name: "Siena Saints", short: "SIEN", seed: 16 },
  ],
  South: [
    { espnId: "57", name: "Florida Gators", short: "FLA", seed: 1 },
    { espnId: "248", name: "Houston Cougars", short: "HOU", seed: 2 },
    { espnId: "356", name: "Illinois Fighting Illini", short: "ILL", seed: 3 },
    { espnId: "158", name: "Nebraska Cornhuskers", short: "NEB", seed: 4 },
    { espnId: "238", name: "Vanderbilt Commodores", short: "VAN", seed: 5 },
    { espnId: "153", name: "North Carolina Tar Heels", short: "UNC", seed: 6 },
    { espnId: "2608", name: "Saint Mary's Gaels", short: "SMC", seed: 7 },
    { espnId: "228", name: "Clemson Tigers", short: "CLEM", seed: 8 },
    { espnId: "2294", name: "Iowa Hawkeyes", short: "IOWA", seed: 9 },
    { espnId: "245", name: "Texas A&M Aggies", short: "TAMU", seed: 10 },
    { espnId: "2670", name: "VCU Rams", short: "VCU", seed: 11 },
    { espnId: "2377", name: "McNeese Cowboys", short: "MCN", seed: 12 },
    { espnId: "2653", name: "Troy Trojans", short: "TROY", seed: 13 },
    { espnId: "219", name: "Penn Quakers", short: "PENN", seed: 14 },
    { espnId: "70", name: "Idaho Vandals", short: "IDHO", seed: 15 },
    { espnId: "2504", name: "Prairie View A&M Panthers", short: "PVAM", seed: 16 },
  ],
  West: [
    { espnId: "12", name: "Arizona Wildcats", short: "ARIZ", seed: 1 },
    { espnId: "2509", name: "Purdue Boilermakers", short: "PUR", seed: 2 },
    { espnId: "2250", name: "Gonzaga Bulldogs", short: "GONZ", seed: 3 },
    { espnId: "8", name: "Arkansas Razorbacks", short: "ARK", seed: 4 },
    { espnId: "275", name: "Wisconsin Badgers", short: "WIS", seed: 5 },
    { espnId: "252", name: "BYU Cougars", short: "BYU", seed: 6 },
    { espnId: "2390", name: "Miami Hurricanes", short: "MIA", seed: 7 },
    { espnId: "222", name: "Villanova Wildcats", short: "NOVA", seed: 8 },
    { espnId: "328", name: "Utah State Aggies", short: "USU", seed: 9 },
    { espnId: "142", name: "Missouri Tigers", short: "MIZ", seed: 10 },
    { espnId: "251", name: "Texas Longhorns", short: "TEX", seed: 11 },
    { espnId: "2272", name: "High Point Panthers", short: "HPU", seed: 12 },
    { espnId: "62", name: "Hawaii Rainbow Warriors", short: "HAW", seed: 13 },
    { espnId: "338", name: "Kennesaw State Owls", short: "KENN", seed: 14 },
    { espnId: "693", name: "Queens Royals", short: "QU", seed: 15 },
    { espnId: "112358", name: "LIU Sharks", short: "LIU", seed: 16 },
  ],
  Midwest: [
    { espnId: "130", name: "Michigan Wolverines", short: "MICH", seed: 1 },
    { espnId: "66", name: "Iowa State Cyclones", short: "ISU", seed: 2 },
    { espnId: "258", name: "Virginia Cavaliers", short: "UVA", seed: 3 },
    { espnId: "333", name: "Alabama Crimson Tide", short: "BAMA", seed: 4 },
    { espnId: "2641", name: "Texas Tech Red Raiders", short: "TTU", seed: 5 },
    { espnId: "2633", name: "Tennessee Volunteers", short: "TENN", seed: 6 },
    { espnId: "96", name: "Kentucky Wildcats", short: "UK", seed: 7 },
    { espnId: "61", name: "Georgia Bulldogs", short: "UGA", seed: 8 },
    { espnId: "139", name: "Saint Louis Billikens", short: "SLU", seed: 9 },
    { espnId: "2541", name: "Santa Clara Broncos", short: "SCU", seed: 10 },
    { espnId: "193", name: "Miami (OH) RedHawks", short: "M-OH", seed: 11 },
    { espnId: "2006", name: "Akron Zips", short: "AKR", seed: 12 },
    { espnId: "2275", name: "Hofstra Pride", short: "HOF", seed: 13 },
    { espnId: "2750", name: "Wright State Raiders", short: "WRST", seed: 14 },
    { espnId: "2634", name: "Tennessee State Tigers", short: "TNST", seed: 15 },
    { espnId: "47", name: "Howard Bison", short: "HOW", seed: 16 },
  ],
};

// Round 1 matchups by game number: [higher seed, lower seed]
// This matches the bracket UI's game ordering
const R1_MATCHUPS = [
  [1, 16], [8, 9], [5, 12], [4, 13],
  [6, 11], [3, 14], [7, 10], [2, 15],
];

const REGION_ORDER = ["East", "South", "West", "Midwest"];

async function seed() {
  console.log("🏀 Seeding 2026 NCAA Tournament data...\n");

  // 1. Find existing 2026 tournament or create one
  let tournament = await db.tournament.findFirst({
    where: { year: 2026 },
  });

  if (tournament) {
    // Check if already seeded with teams
    const existingTeams = await db.tournamentTeam.count({
      where: { tournamentId: tournament.id },
    });
    if (existingTeams > 0) {
      console.log(`⚠️  Tournament already has ${existingTeams} teams. Skipping seed.`);
      console.log("   To re-seed, manually delete existing TournamentTeam and Game records first.");
      return;
    }
    console.log("✅ Found existing 2026 tournament:", tournament.name);
  } else {
    tournament = await db.tournament.create({
      data: {
        name: "2026 NCAA Men's Basketball Tournament",
        year: 2026,
        startDate: new Date("2026-03-19"),
        endDate: new Date("2026-04-06"),
      },
    });
    console.log("✅ Created tournament:", tournament.name);
  }

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
            logo: `https://a.espncdn.com/i/teamlogos/ncaa/500/${teamData.espnId}.png`,
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

  // 3. Create Game shells (no results — tournament starts today)
  // Uses sequential game numbering per round (same as 2025 seed)
  // R1: East 1-8, South 9-16, West 17-24, Midwest 25-32
  // R2: East 1-4, South 5-8, West 9-12, Midwest 13-16
  // R3: East 1-2, South 3-4, West 5-6, Midwest 7-8
  // R4: East 1, South 2, West 3, Midwest 4
  let gamesCreated = 0;
  let gameNumber = 0;

  // Round 1: 8 games per region
  for (const region of REGION_ORDER) {
    const regionTeams = REGIONS[region as keyof typeof REGIONS];
    for (let g = 0; g < R1_MATCHUPS.length; g++) {
      gameNumber++;
      const [seed1, seed2] = R1_MATCHUPS[g];
      const team1 = regionTeams.find((t) => t.seed === seed1)!;
      const team2 = regionTeams.find((t) => t.seed === seed2)!;

      await db.game.create({
        data: {
          round: 1,
          gameNumber,
          region,
          team1Id: teamMap.get(team1.espnId)!,
          team2Id: teamMap.get(team2.espnId)!,
          tournamentId: tournament.id,
        },
      });
      gamesCreated++;
    }
  }

  // Round 2: 4 games per region (teams TBD)
  gameNumber = 0;
  for (const region of REGION_ORDER) {
    for (let g = 0; g < 4; g++) {
      gameNumber++;
      await db.game.create({
        data: {
          round: 2,
          gameNumber,
          region,
          tournamentId: tournament.id,
        },
      });
      gamesCreated++;
    }
  }

  // Round 3 (Sweet 16): 2 games per region
  gameNumber = 0;
  for (const region of REGION_ORDER) {
    for (let g = 0; g < 2; g++) {
      gameNumber++;
      await db.game.create({
        data: {
          round: 3,
          gameNumber,
          region,
          tournamentId: tournament.id,
        },
      });
      gamesCreated++;
    }
  }

  // Round 4 (Elite 8): 1 game per region
  gameNumber = 0;
  for (const region of REGION_ORDER) {
    gameNumber++;
    await db.game.create({
      data: {
        round: 4,
        gameNumber,
        region,
        tournamentId: tournament.id,
      },
    });
    gamesCreated++;
  }

  // Round 5 (Final Four): 2 games, no region
  for (let g = 1; g <= 2; g++) {
    await db.game.create({
      data: {
        round: 5,
        gameNumber: g,
        region: null,
        tournamentId: tournament.id,
      },
    });
    gamesCreated++;
  }

  // Round 6 (Championship): 1 game, no region
  await db.game.create({
    data: {
      round: 6,
      gameNumber: 1,
      region: null,
      tournamentId: tournament.id,
    },
  });
  gamesCreated++;

  console.log(`✅ Created ${gamesCreated} games (32 R1 with teams, 31 later rounds TBD)`);

  console.log("\n🎉 2026 Tournament seed complete!");
  console.log("   - 64 teams seeded across 4 regions");
  console.log("   - 63 games created (R1 has matchups, R2-R6 await results)");
  console.log("   - Go to Admin → Results to enter game winners as they happen");
  console.log("   - Click 'Recalculate Scores' after entering results to update brackets");
}

seed()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });