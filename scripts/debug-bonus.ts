import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function debug() {
  const tournament = await db.tournament.findFirst({ orderBy: { year: "desc" } });
  if (!tournament) { console.log("No tournament"); return; }

  // Check Elite 8 games (round 4)
  const allGames = await db.game.findMany({
    where: { tournamentId: tournament.id },
    include: { 
      team1: { include: { team: true } }, 
      team2: { include: { team: true } }, 
      winner: { include: { team: true } } 
    },
    orderBy: [{ round: "asc" }, { gameNumber: "asc" }],
  });

  const e8Games = allGames.filter(g => g.round === 4);
  const finalGames = allGames.filter(g => g.winnerId && g.status === "FINAL");

  console.log(`\n=== Elite 8 Games (Round 4): ${e8Games.length} total ===`);
  for (const g of e8Games) {
    console.log(`Game ${g.gameNumber} | Region: ${g.region} | Status: ${g.status} | Winner: ${g.winner?.team?.name || "NONE"} (${g.winnerId})`);
  }
  console.log(`\nFINAL games with winners (all rounds): ${finalGames.length}`);
  console.log(`FINAL R4 games: ${finalGames.filter(g => g.round === 4).length} / 4 needed`);

  // Build bracketGameMap same way scoring code does
  const bracketGameMap = new Map<string, typeof allGames[0]>();
  const grouped = new Map<string, typeof allGames>();
  for (const g of allGames) {
    const key = `${g.round}-${g.region || "none"}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(g);
  }
  for (const [, group] of grouped) {
    group.sort((a, b) => a.gameNumber - b.gameNumber);
    for (let i = 0; i < group.length; i++) {
      const g = group[i];
      let bracketId: string;
      if (g.region && g.round <= 4) {
        bracketId = `${g.region}-r${g.round}-g${i + 1}`;
      } else if (g.round === 5) {
        bracketId = `final-four-r5-g${g.gameNumber}`;
      } else {
        bracketId = `championship-r6-g${g.gameNumber}`;
      }
      bracketGameMap.set(bracketId, g);
    }
  }

  // Show what bracket gameIds map to for R4
  console.log(`\n=== bracketGameMap R4 entries ===`);
  for (const [key, g] of bracketGameMap) {
    if (g.round === 4) {
      console.log(`  ${key} -> Game ${g.gameNumber} (${g.region}) Winner: ${g.winner?.team?.name || "NONE"} (${g.winnerId})`);
    }
  }

  // Build teamIdMap
  const tournamentTeams = await db.tournamentTeam.findMany({
    where: { tournamentId: tournament.id },
    select: { id: true, seed: true, region: true, team: { select: { name: true } } },
  });
  const teamIdMap = new Map<string, string>();
  for (const tt of tournamentTeams) {
    const key = `${tt.region.toLowerCase()}-${tt.seed}`;
    teamIdMap.set(key, tt.id);
  }

  // Now simulate the picksData bonus check
  const brackets = await db.bracket.findMany({
    where: { status: { in: ["SUBMITTED", "PAID"] } },
    select: { id: true, name: true, entryName: true, picksData: true, totalScore: true, bonusScore: true },
  });

  let bonusCount = 0;
  console.log(`\n=== Simulating bonus for ${brackets.length} picksData brackets ===`);

  for (const bracket of brackets) {
    if (!bracket.picksData) continue;
    try {
      const picksArray = JSON.parse(bracket.picksData);
      const picksDataFinalFour: { gameId: string; teamId: string; pickedKey: string }[] = [];

      for (const pickData of picksArray) {
        if (!pickData.gameId || !pickData.choices) continue;
        const game = bracketGameMap.get(pickData.gameId);
        if (!game || !game.winnerId) continue;
        if (game.round === 4 && pickData.choices[0]) {
          const firstChoiceId = teamIdMap.get(pickData.choices[0]) || pickData.choices[0];
          picksDataFinalFour.push({ gameId: game.id, teamId: firstChoiceId, pickedKey: pickData.choices[0] });
        }
      }

      const pdFinalFourGames = finalGames.filter(g => g.round === 4);
      if (pdFinalFourGames.length === 4 && picksDataFinalFour.length === 4) {
        let allCorrect = true;
        for (const ffGame of pdFinalFourGames) {
          const pick = picksDataFinalFour.find(p => p.gameId === ffGame.id);
          if (!pick || pick.teamId !== ffGame.winnerId) {
            allCorrect = false;
            break;
          }
        }
        if (allCorrect) {
          bonusCount++;
          console.log(`  BONUS: "${bracket.name}" (${bracket.entryName}) | Current score: ${bracket.totalScore}, bonus: ${bracket.bonusScore}`);
          for (const p of picksDataFinalFour) {
            const game = pdFinalFourGames.find(g => g.id === p.gameId);
            console.log(`    Picked: ${p.pickedKey} -> ${p.teamId} | Winner: ${game?.winnerId} | Match: ${p.teamId === game?.winnerId}`);
          }
        }
      }
    } catch { /* skip */ }
  }

  console.log(`\nTotal brackets qualifying for bonus: ${bonusCount}`);
  await db.$disconnect();
}
debug().catch(console.error);
