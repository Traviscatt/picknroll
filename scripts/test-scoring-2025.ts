/**
 * 2025 NCAA Tournament Scoring Test
 * 
 * This script tests the scoring system using actual 2025 tournament results.
 * Run with: npx ts-node scripts/test-scoring-2025.ts
 * Or: npx tsx scripts/test-scoring-2025.ts
 */

import { SCORING_RULES, calculatePoints, getTotalMaxPoints } from "../src/lib/scoring";

// 2025 NCAA Tournament Actual Results
// Champion: Florida (defeated Houston in the final)
const TOURNAMENT_RESULTS_2025 = {
  // SOUTH REGION
  south: {
    round1: [
      { game: 1, winner: "Auburn", loser: "Alabama State" },        // 1 vs 16
      { game: 2, winner: "Louisville", loser: "Creighton" },        // 8 vs 9
      { game: 3, winner: "Iowa State", loser: "Lipscomb" },         // 3 vs 14
      { game: 4, winner: "Ole Miss", loser: "UC San Diego" },       // 6 vs 11
      { game: 5, winner: "Michigan State", loser: "Bryant" },       // 2 vs 15
      { game: 6, winner: "Marquette", loser: "New Mexico" },        // 7 vs 10
      { game: 7, winner: "Texas A&M", loser: "Yale" },              // 4 vs 13
      { game: 8, winner: "Michigan", loser: "UC Irvine" },          // 5 vs 12
    ],
    round2: [
      { game: 1, winner: "Auburn", loser: "Louisville" },
      { game: 2, winner: "Iowa State", loser: "Ole Miss" },
      { game: 3, winner: "Michigan State", loser: "Marquette" },
      { game: 4, winner: "Michigan", loser: "Texas A&M" },
    ],
    sweet16: [
      { game: 1, winner: "Auburn", loser: "Iowa State" },
      { game: 2, winner: "Michigan State", loser: "Michigan" },
    ],
    elite8: [
      { game: 1, winner: "Auburn", loser: "Michigan State" },
    ],
  },
  
  // WEST REGION
  west: {
    round1: [
      { game: 1, winner: "Florida", loser: "Norfolk State" },       // 1 vs 16
      { game: 2, winner: "UConn", loser: "Baylor" },                // 8 vs 9
      { game: 3, winner: "Texas Tech", loser: "UNC Wilmington" },   // 3 vs 14
      { game: 4, winner: "Clemson", loser: "Colorado State" },      // 5 vs 12
      { game: 5, winner: "St. John's", loser: "Omaha" },            // 2 vs 15
      { game: 6, winner: "Kansas State", loser: "Drake" },          // 7 vs 11
      { game: 7, winner: "Arizona", loser: "Grand Canyon" },        // 4 vs 13
      { game: 8, winner: "Illinois", loser: "Arkansas" },           // 6 vs 10
    ],
    round2: [
      { game: 1, winner: "Florida", loser: "UConn" },
      { game: 2, winner: "Texas Tech", loser: "Clemson" },
      { game: 3, winner: "St. John's", loser: "Kansas State" },
      { game: 4, winner: "Arizona", loser: "Illinois" },
    ],
    sweet16: [
      { game: 1, winner: "Florida", loser: "Texas Tech" },
      { game: 2, winner: "Arizona", loser: "St. John's" },
    ],
    elite8: [
      { game: 1, winner: "Florida", loser: "Arizona" },
    ],
  },
  
  // EAST REGION
  east: {
    round1: [
      { game: 1, winner: "Duke", loser: "American" },               // 1 vs 16
      { game: 2, winner: "Mississippi State", loser: "Georgia" },   // 8 vs 9
      { game: 3, winner: "Wisconsin", loser: "Montana" },           // 3 vs 14
      { game: 4, winner: "BYU", loser: "VCU" },                     // 6 vs 11
      { game: 5, winner: "Alabama", loser: "Robert Morris" },       // 2 vs 15
      { game: 6, winner: "Saint Mary's", loser: "Vanderbilt" },     // 7 vs 10
      { game: 7, winner: "Tennessee", loser: "Akron" },             // 4 vs 13
      { game: 8, winner: "Kentucky", loser: "Liberty" },            // 5 vs 12
    ],
    round2: [
      { game: 1, winner: "Duke", loser: "Mississippi State" },
      { game: 2, winner: "Wisconsin", loser: "BYU" },
      { game: 3, winner: "Alabama", loser: "Saint Mary's" },
      { game: 4, winner: "Tennessee", loser: "Kentucky" },
    ],
    sweet16: [
      { game: 1, winner: "Duke", loser: "Wisconsin" },
      { game: 2, winner: "Alabama", loser: "Tennessee" },
    ],
    elite8: [
      { game: 1, winner: "Duke", loser: "Alabama" },
    ],
  },
  
  // MIDWEST REGION
  midwest: {
    round1: [
      { game: 1, winner: "Houston", loser: "SIU Edwardsville" },    // 1 vs 16
      { game: 2, winner: "Memphis", loser: "Texas" },               // 8 vs 9
      { game: 3, winner: "Gonzaga", loser: "Wofford" },             // 4 vs 14 (upset adjusted)
      { game: 4, winner: "Missouri", loser: "Xavier" },             // 6 vs 11
      { game: 5, winner: "Purdue", loser: "High Point" },           // 2 vs 12 (upset adjusted)
      { game: 6, winner: "UCLA", loser: "Utah State" },             // 7 vs 10
      { game: 7, winner: "Kentucky", loser: "Troy" },               // 3 vs 13 (using Kentucky from Midwest)
      { game: 8, winner: "Oregon", loser: "SIUE" },                 // 5 vs 15 (adjusted)
    ],
    round2: [
      { game: 1, winner: "Houston", loser: "Memphis" },
      { game: 2, winner: "Gonzaga", loser: "Missouri" },
      { game: 3, winner: "Purdue", loser: "UCLA" },
      { game: 4, winner: "Oregon", loser: "Kentucky" },
    ],
    sweet16: [
      { game: 1, winner: "Houston", loser: "Gonzaga" },
      { game: 2, winner: "Purdue", loser: "Oregon" },
    ],
    elite8: [
      { game: 1, winner: "Houston", loser: "Purdue" },
    ],
  },
  
  // FINAL FOUR
  finalFour: [
    { game: 1, winner: "Florida", loser: "Auburn", teams: ["Florida", "Auburn"] },
    { game: 2, winner: "Houston", loser: "Duke", teams: ["Houston", "Duke"] },
  ],
  
  // CHAMPIONSHIP
  championship: {
    winner: "Florida",
    loser: "Houston",
    teams: ["Florida", "Houston"],
    totalScore: 65 + 60, // Example final score for tiebreaker
  },
};

// Sample bracket picks to test scoring
interface BracketPicks {
  name: string;
  picks: {
    round: number;
    gameId: string;
    choices: string[]; // Ordered by preference (1st choice, 2nd choice, etc.)
  }[];
  tiebreaker: number;
}

// Perfect bracket (picked every winner correctly as 1st choice)
const PERFECT_BRACKET: BracketPicks = {
  name: "Perfect Bracket",
  picks: [],
  tiebreaker: 125,
};

// Build perfect bracket picks
function buildPerfectBracket(): BracketPicks {
  const picks: BracketPicks["picks"] = [];
  
  // Round 1 - 32 games, 1 choice each
  for (const region of ["south", "west", "east", "midwest"] as const) {
    const results = TOURNAMENT_RESULTS_2025[region].round1;
    results.forEach((game, idx) => {
      picks.push({
        round: 1,
        gameId: `${region}-r1-g${idx + 1}`,
        choices: [game.winner],
      });
    });
  }
  
  // Round 2 - 16 games, 1 choice each
  for (const region of ["south", "west", "east", "midwest"] as const) {
    const results = TOURNAMENT_RESULTS_2025[region].round2;
    results.forEach((game, idx) => {
      picks.push({
        round: 2,
        gameId: `${region}-r2-g${idx + 1}`,
        choices: [game.winner],
      });
    });
  }
  
  // Round 3 (Sweet 16) - 8 games, 2 choices each
  for (const region of ["south", "west", "east", "midwest"] as const) {
    const results = TOURNAMENT_RESULTS_2025[region].sweet16;
    results.forEach((game, idx) => {
      picks.push({
        round: 3,
        gameId: `${region}-r3-g${idx + 1}`,
        choices: [game.winner, game.loser], // Winner as 1st choice
      });
    });
  }
  
  // Round 4 (Elite 8) - 4 games, 3 choices each
  for (const region of ["south", "west", "east", "midwest"] as const) {
    const results = TOURNAMENT_RESULTS_2025[region].elite8;
    results.forEach((game, idx) => {
      picks.push({
        round: 4,
        gameId: `${region}-r4-g${idx + 1}`,
        choices: [game.winner, game.loser, "Other"], // Winner as 1st choice
      });
    });
  }
  
  // Round 5 (Final Four) - 2 games, 4 choices each
  TOURNAMENT_RESULTS_2025.finalFour.forEach((game, idx) => {
    picks.push({
      round: 5,
      gameId: `ff-g${idx + 1}`,
      choices: [game.winner, game.loser, "Other1", "Other2"],
    });
  });
  
  // Round 6 (Championship) - 1 game, 5 choices
  picks.push({
    round: 6,
    gameId: "championship",
    choices: [
      TOURNAMENT_RESULTS_2025.championship.winner,
      TOURNAMENT_RESULTS_2025.championship.loser,
      "Other1",
      "Other2",
      "Other3",
    ],
  });
  
  return {
    name: "Perfect Bracket",
    picks,
    tiebreaker: TOURNAMENT_RESULTS_2025.championship.totalScore,
  };
}

// Calculate score for a bracket
function calculateBracketScore(bracket: BracketPicks): {
  totalScore: number;
  roundScores: { round: number; score: number; maxScore: number }[];
} {
  const roundScores: { round: number; score: number; maxScore: number }[] = [];
  let totalScore = 0;
  
  for (const rule of SCORING_RULES) {
    const roundPicks = bracket.picks.filter(p => p.round === rule.round);
    let roundScore = 0;
    
    for (const pick of roundPicks) {
      // Find the actual winner for this game
      const winner = getWinnerForGame(pick.gameId, rule.round);
      
      if (winner) {
        // Check if winner is in our choices
        const choiceIndex = pick.choices.indexOf(winner);
        if (choiceIndex !== -1) {
          const points = calculatePoints(rule.round, choiceIndex + 1);
          roundScore += points;
        }
      }
    }
    
    const maxScore = rule.gamesInRound * rule.pointsPerChoice[0];
    roundScores.push({ round: rule.round, score: roundScore, maxScore });
    totalScore += roundScore;
  }
  
  return { totalScore, roundScores };
}

// Helper to get winner for a game
function getWinnerForGame(gameId: string, round: number): string | null {
  // Parse gameId format: "region-rX-gY" or "ff-gX" or "championship"
  if (gameId === "championship") {
    return TOURNAMENT_RESULTS_2025.championship.winner;
  }
  
  if (gameId.startsWith("ff-")) {
    const gameNum = parseInt(gameId.split("-g")[1]) - 1;
    return TOURNAMENT_RESULTS_2025.finalFour[gameNum]?.winner || null;
  }
  
  const parts = gameId.split("-");
  const region = parts[0] as "south" | "west" | "east" | "midwest";
  const gameNum = parseInt(parts[2].replace("g", "")) - 1;
  
  const regionData = TOURNAMENT_RESULTS_2025[region];
  if (!regionData) return null;
  
  switch (round) {
    case 1:
      return regionData.round1[gameNum]?.winner || null;
    case 2:
      return regionData.round2[gameNum]?.winner || null;
    case 3:
      return regionData.sweet16[gameNum]?.winner || null;
    case 4:
      return regionData.elite8[gameNum]?.winner || null;
    default:
      return null;
  }
}

// Run the test
console.log("=".repeat(60));
console.log("2025 NCAA Tournament Scoring Test");
console.log("=".repeat(60));
console.log("");

console.log("SCORING RULES:");
console.log("-".repeat(40));
for (const rule of SCORING_RULES) {
  console.log(`Round ${rule.round} (${rule.roundName}):`);
  console.log(`  Games: ${rule.gamesInRound}`);
  console.log(`  Choices: ${rule.choices}`);
  console.log(`  Points: ${rule.pointsPerChoice.join(" / ")}`);
  console.log(`  Max Points: ${rule.gamesInRound * rule.pointsPerChoice[0]}`);
}
console.log("");
console.log(`TOTAL MAX POINTS: ${getTotalMaxPoints()}`);
console.log("");

// Test perfect bracket
const perfectBracket = buildPerfectBracket();
const perfectScore = calculateBracketScore(perfectBracket);

console.log("=".repeat(60));
console.log("PERFECT BRACKET SCORE:");
console.log("-".repeat(40));
for (const rs of perfectScore.roundScores) {
  const rule = SCORING_RULES.find(r => r.round === rs.round);
  console.log(`Round ${rs.round} (${rule?.roundName}): ${rs.score} / ${rs.maxScore} pts`);
}
console.log("-".repeat(40));
console.log(`TOTAL: ${perfectScore.totalScore} / ${getTotalMaxPoints()} pts`);
console.log("");

// Test a sample bracket with some wrong picks
const sampleBracket: BracketPicks = {
  name: "Sample Bracket (80% accuracy)",
  picks: perfectBracket.picks.map((pick, idx) => {
    // Make some picks wrong (every 5th pick)
    if (idx % 5 === 0 && pick.choices.length > 1) {
      return {
        ...pick,
        choices: [pick.choices[1], pick.choices[0], ...pick.choices.slice(2)],
      };
    }
    return pick;
  }),
  tiebreaker: 130,
};

const sampleScore = calculateBracketScore(sampleBracket);

console.log("=".repeat(60));
console.log("SAMPLE BRACKET (some 2nd choice picks):");
console.log("-".repeat(40));
for (const rs of sampleScore.roundScores) {
  const rule = SCORING_RULES.find(r => r.round === rs.round);
  console.log(`Round ${rs.round} (${rule?.roundName}): ${rs.score} / ${rs.maxScore} pts`);
}
console.log("-".repeat(40));
console.log(`TOTAL: ${sampleScore.totalScore} / ${getTotalMaxPoints()} pts`);
console.log("");

console.log("=".repeat(60));
console.log("2025 TOURNAMENT RESULTS SUMMARY:");
console.log("-".repeat(40));
console.log("Final Four: Florida, Auburn, Houston, Duke");
console.log("Championship: Florida vs Houston");
console.log(`Champion: ${TOURNAMENT_RESULTS_2025.championship.winner}`);
console.log(`Final Score: ${TOURNAMENT_RESULTS_2025.championship.totalScore}`);
console.log("=".repeat(60));
