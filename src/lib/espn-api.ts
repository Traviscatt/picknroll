// ESPN API Integration for NCAA Tournament Data
// ESPN provides public API endpoints for sports data

const ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball";

export interface ESPNTeam {
  id: string;
  name: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  logo?: string;
  seed?: number;
}

export interface ESPNGame {
  id: string;
  date: string;
  status: {
    type: {
      id: string;
      name: string;
      state: "pre" | "in" | "post";
      completed: boolean;
    };
  };
  competitions: Array<{
    id: string;
    competitors: Array<{
      id: string;
      team: ESPNTeam;
      score: string;
      winner?: boolean;
      curatedRank?: {
        current: number;
      };
    }>;
  }>;
}

export interface ESPNScoreboard {
  events: ESPNGame[];
}

// Fetch current scoreboard
export async function getScoreboard(): Promise<ESPNScoreboard> {
  const response = await fetch(`${ESPN_BASE_URL}/scoreboard`, {
    next: { revalidate: 60 }, // Cache for 1 minute
  });

  if (!response.ok) {
    throw new Error("Failed to fetch ESPN scoreboard");
  }

  return response.json();
}

// Fetch tournament bracket data
export async function getTournamentBracket(year: number = new Date().getFullYear()) {
  // ESPN tournament endpoint
  const response = await fetch(
    `${ESPN_BASE_URL}/tournament?year=${year}`,
    {
      next: { revalidate: 300 }, // Cache for 5 minutes
    }
  );

  if (!response.ok) {
    // Tournament data might not be available
    return null;
  }

  return response.json();
}

// Fetch specific game details
export async function getGameDetails(gameId: string): Promise<ESPNGame | null> {
  try {
    const response = await fetch(
      `${ESPN_BASE_URL}/summary?event=${gameId}`,
      {
        next: { revalidate: 30 }, // Cache for 30 seconds during games
      }
    );

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

// Fetch teams for the tournament
export async function getTournamentTeams(year: number = new Date().getFullYear()) {
  try {
    const response = await fetch(
      `${ESPN_BASE_URL}/teams?limit=100`,
      {
        next: { revalidate: 86400 }, // Cache for 24 hours
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.sports?.[0]?.leagues?.[0]?.teams || [];
  } catch {
    return [];
  }
}

// Parse game result for scoring
export function parseGameResult(game: ESPNGame) {
  const competition = game.competitions[0];
  if (!competition) return null;

  const isComplete = game.status.type.completed;
  const isInProgress = game.status.type.state === "in";

  const teams = competition.competitors.map((c) => ({
    id: c.id,
    name: c.team.displayName,
    abbreviation: c.team.abbreviation,
    score: parseInt(c.score) || 0,
    isWinner: c.winner || false,
    seed: c.curatedRank?.current,
  }));

  const winner = isComplete ? teams.find((t) => t.isWinner) : null;

  return {
    gameId: game.id,
    status: game.status.type.state,
    isComplete,
    isInProgress,
    teams,
    winner,
    startTime: game.date,
  };
}

// Map ESPN game to our game model
export function mapESPNGameToGame(espnGame: ESPNGame, round: number, gameNumber: number) {
  const result = parseGameResult(espnGame);
  if (!result) return null;

  return {
    espnGameId: espnGame.id,
    round,
    gameNumber,
    status: result.isComplete ? "FINAL" : result.isInProgress ? "IN_PROGRESS" : "SCHEDULED",
    team1Score: result.teams[0]?.score,
    team2Score: result.teams[1]?.score,
    winnerId: result.winner?.id,
    startTime: new Date(result.startTime),
  };
}

// Utility to determine round from ESPN data
export function determineRound(espnRoundName: string): number {
  const roundMap: Record<string, number> = {
    "First Round": 1,
    "Second Round": 2,
    "Sweet 16": 3,
    "Elite Eight": 4,
    "Final Four": 5,
    "Championship": 6,
    "National Championship": 6,
  };

  return roundMap[espnRoundName] || 1;
}
