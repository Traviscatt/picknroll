// Shared team lookup for bracket display
// Team IDs follow the pattern: {region}-{seed} (e.g., "east-1", "south-3")

const REGIONS = ["East", "South", "West", "Midwest"] as const;

const TEAM_NAMES: string[] = [
  // EAST (seeds 1-16)
  "Duke", "UConn", "Michigan State", "Kansas", "St. John's", "Louisville",
  "UCLA", "Ohio State", "TCU", "UCF", "South Florida", "Northern Iowa",
  "Cal Baptist", "North Dakota State", "Furman", "Siena",
  // SOUTH (seeds 1-16)
  "Florida", "Houston", "Illinois", "Nebraska", "Vanderbilt", "North Carolina",
  "Saint Mary's", "Clemson", "Iowa", "Texas A&M", "VCU", "McNeese",
  "Troy", "Penn", "Idaho", "Prairie View A&M/Lehigh",
  // WEST (seeds 1-16)
  "Arizona", "Purdue", "Gonzaga", "Arkansas", "Wisconsin", "BYU",
  "Miami (FL)", "Villanova", "Utah State", "Missouri", "Texas/NC State", "High Point",
  "Hawaii", "Kennesaw State", "Queens", "LIU",
  // MIDWEST (seeds 1-16)
  "Michigan", "Iowa State", "Virginia", "Alabama", "Texas Tech", "Tennessee",
  "Kentucky", "Georgia", "Saint Louis", "Santa Clara", "Miami (OH)/SMU", "Akron",
  "Hofstra", "Wright State", "Tennessee State", "UMBC/Howard",
];

export interface TeamLookup {
  name: string;
  seed: number;
  region: string;
}

// Build a map from team ID to team info
const teamMap = new Map<string, TeamLookup>();
let idx = 0;
for (const region of REGIONS) {
  for (let seed = 1; seed <= 16; seed++) {
    const id = `${region.toLowerCase()}-${seed}`;
    teamMap.set(id, {
      name: TEAM_NAMES[idx] || `Team ${idx + 1}`,
      seed,
      region,
    });
    idx++;
  }
}

// ESPN logo URLs in same order as TEAM_NAMES (East 1-16, South 1-16, West 1-16, Midwest 1-16)
export const TEAM_LOGOS: string[] = [
  // EAST
  "https://a.espncdn.com/i/teamlogos/ncaa/500/150.png",  // Duke
  "https://a.espncdn.com/i/teamlogos/ncaa/500/41.png",   // UConn
  "https://a.espncdn.com/i/teamlogos/ncaa/500/127.png",  // Michigan State
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2305.png", // Kansas
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2599.png", // St. John's
  "https://a.espncdn.com/i/teamlogos/ncaa/500/97.png",   // Louisville
  "https://a.espncdn.com/i/teamlogos/ncaa/500/26.png",   // UCLA
  "https://a.espncdn.com/i/teamlogos/ncaa/500/194.png",  // Ohio State
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2628.png", // TCU
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2116.png", // UCF
  "https://a.espncdn.com/i/teamlogos/ncaa/500/58.png",   // South Florida
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2460.png", // Northern Iowa
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2856.png", // Cal Baptist
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2449.png", // North Dakota State
  "https://a.espncdn.com/i/teamlogos/ncaa/500/231.png",  // Furman
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2561.png", // Siena
  // SOUTH
  "https://a.espncdn.com/i/teamlogos/ncaa/500/57.png",   // Florida
  "https://a.espncdn.com/i/teamlogos/ncaa/500/248.png",  // Houston
  "https://a.espncdn.com/i/teamlogos/ncaa/500/356.png",  // Illinois
  "https://a.espncdn.com/i/teamlogos/ncaa/500/158.png",  // Nebraska
  "https://a.espncdn.com/i/teamlogos/ncaa/500/238.png",  // Vanderbilt
  "https://a.espncdn.com/i/teamlogos/ncaa/500/153.png",  // North Carolina
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2608.png", // Saint Mary's
  "https://a.espncdn.com/i/teamlogos/ncaa/500/228.png",  // Clemson
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2294.png", // Iowa
  "https://a.espncdn.com/i/teamlogos/ncaa/500/245.png",  // Texas A&M
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2670.png", // VCU
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2377.png", // McNeese
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2653.png", // Troy
  "https://a.espncdn.com/i/teamlogos/ncaa/500/219.png",  // Penn
  "https://a.espncdn.com/i/teamlogos/ncaa/500/70.png",   // Idaho
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2504.png", // Prairie View A&M/Lehigh
  // WEST
  "https://a.espncdn.com/i/teamlogos/ncaa/500/12.png",   // Arizona
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2509.png", // Purdue
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2250.png", // Gonzaga
  "https://a.espncdn.com/i/teamlogos/ncaa/500/8.png",    // Arkansas
  "https://a.espncdn.com/i/teamlogos/ncaa/500/275.png",  // Wisconsin
  "https://a.espncdn.com/i/teamlogos/ncaa/500/252.png",  // BYU
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2390.png", // Miami (FL)
  "https://a.espncdn.com/i/teamlogos/ncaa/500/222.png",  // Villanova
  "https://a.espncdn.com/i/teamlogos/ncaa/500/328.png",  // Utah State
  "https://a.espncdn.com/i/teamlogos/ncaa/500/142.png",  // Missouri
  "https://a.espncdn.com/i/teamlogos/ncaa/500/251.png",  // Texas/NC State
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2272.png", // High Point
  "https://a.espncdn.com/i/teamlogos/ncaa/500/62.png",   // Hawaii
  "https://a.espncdn.com/i/teamlogos/ncaa/500/338.png",  // Kennesaw State
  "https://a.espncdn.com/i/teamlogos/ncaa/500/693.png",  // Queens
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2344.png", // LIU
  // MIDWEST
  "https://a.espncdn.com/i/teamlogos/ncaa/500/130.png",  // Michigan
  "https://a.espncdn.com/i/teamlogos/ncaa/500/66.png",   // Iowa State
  "https://a.espncdn.com/i/teamlogos/ncaa/500/258.png",  // Virginia
  "https://a.espncdn.com/i/teamlogos/ncaa/500/333.png",  // Alabama
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2641.png", // Texas Tech
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2633.png", // Tennessee
  "https://a.espncdn.com/i/teamlogos/ncaa/500/96.png",   // Kentucky
  "https://a.espncdn.com/i/teamlogos/ncaa/500/61.png",   // Georgia
  "https://a.espncdn.com/i/teamlogos/ncaa/500/139.png",  // Saint Louis
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2541.png", // Santa Clara
  "https://a.espncdn.com/i/teamlogos/ncaa/500/193.png",  // Miami (OH)/SMU
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2006.png", // Akron
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2275.png", // Hofstra
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2750.png", // Wright State
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2634.png", // Tennessee State
  "https://a.espncdn.com/i/teamlogos/ncaa/500/2674.png", // UMBC/Howard
];

export function getTeamName(teamId: string): string {
  return teamMap.get(teamId)?.name || teamId;
}

export function getTeamLogo(teamId: string): string | null {
  const info = teamMap.get(teamId);
  if (!info) return null;
  const regionIndex = REGIONS.findIndex((r) => r.toLowerCase() === info.region.toLowerCase());
  if (regionIndex === -1) return null;
  const dataIndex = regionIndex * 16 + (info.seed - 1);
  return TEAM_LOGOS[dataIndex] || null;
}

export function getTeamInfo(teamId: string): TeamLookup | undefined {
  return teamMap.get(teamId);
}

export { REGIONS };
