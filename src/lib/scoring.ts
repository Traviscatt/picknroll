// Pick N Roll Scoring System
// Multi-choice scoring for rounds 3-6

export interface ScoringRule {
  round: number;
  roundName: string;
  gamesInRound: number;
  choices: number;
  pointsPerChoice: number[];
}

export const SCORING_RULES: ScoringRule[] = [
  {
    round: 1,
    roundName: "First Round",
    gamesInRound: 32,
    choices: 1,
    pointsPerChoice: [2],
  },
  {
    round: 2,
    roundName: "Second Round",
    gamesInRound: 16,
    choices: 1,
    pointsPerChoice: [5],
  },
  {
    round: 3,
    roundName: "Sweet 16",
    gamesInRound: 8,
    choices: 2,
    pointsPerChoice: [10, 5],
  },
  {
    round: 4,
    roundName: "Elite Eight",
    gamesInRound: 4,
    choices: 3,
    pointsPerChoice: [15, 10, 5],
  },
  {
    round: 5,
    roundName: "Final Four",
    gamesInRound: 2,
    choices: 4,
    pointsPerChoice: [25, 15, 10, 5],
  },
  {
    round: 6,
    roundName: "Championship",
    gamesInRound: 1,
    choices: 5,
    pointsPerChoice: [35, 25, 15, 10, 5],
  },
];

export function getScoringRule(round: number): ScoringRule | undefined {
  return SCORING_RULES.find((rule) => rule.round === round);
}

export function calculatePoints(round: number, choiceRank: number): number {
  const rule = getScoringRule(round);
  if (!rule) return 0;
  
  // choiceRank is 1-indexed (1 = first choice, 2 = second choice, etc.)
  const index = choiceRank - 1;
  if (index < 0 || index >= rule.pointsPerChoice.length) return 0;
  
  return rule.pointsPerChoice[index];
}

export function getMaxPointsForRound(round: number): number {
  const rule = getScoringRule(round);
  if (!rule) return 0;
  
  // Max points = games in round * points for 1st choice
  return rule.gamesInRound * rule.pointsPerChoice[0];
}

export function getTotalMaxPoints(): number {
  return SCORING_RULES.reduce((total, rule) => {
    return total + rule.gamesInRound * rule.pointsPerChoice[0];
  }, 0);
}

export function getChoicesForRound(round: number): number {
  const rule = getScoringRule(round);
  return rule?.choices ?? 1;
}

// Calculate points for a pick given the game result
export function calculatePickPoints(
  round: number,
  choiceRank: number,
  isCorrect: boolean
): number {
  if (!isCorrect) return 0;
  return calculatePoints(round, choiceRank);
}

// Scoring summary for display
export const SCORING_SUMMARY = {
  round1: "2 pts per correct pick",
  round2: "5 pts per correct pick",
  round3: "1st choice: 10 pts, 2nd choice: 5 pts",
  round4: "1st: 15 pts, 2nd: 10 pts, 3rd: 5 pts",
  round5: "1st: 25 pts, 2nd: 15 pts, 3rd: 10 pts, 4th: 5 pts",
  round6: "1st: 35 pts, 2nd: 25 pts, 3rd: 15 pts, 4th: 10 pts, 5th: 5 pts",
  maxTotal: getTotalMaxPoints(),
};
