// NCAA Tournament Team Colors
// Key = slug used in DB (favoriteTeam field)
// Colors sourced from official brand guidelines

export interface TeamColor {
  name: string;
  primary: string;
  secondary: string;
  logo: string;
}

export const TEAM_COLORS: Record<string, TeamColor> = {
  // SOUTH REGION
  "auburn": { name: "Auburn", primary: "#0C2340", secondary: "#E87722", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2.png" },
  "michigan-state": { name: "Michigan State", primary: "#18453B", secondary: "#FFFFFF", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/127.png" },
  "iowa-state": { name: "Iowa State", primary: "#C8102E", secondary: "#F1BE48", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/66.png" },
  "texas-am": { name: "Texas A&M", primary: "#500000", secondary: "#FFFFFF", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/245.png" },
  "michigan": { name: "Michigan", primary: "#00274C", secondary: "#FFCB05", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/130.png" },
  "ole-miss": { name: "Ole Miss", primary: "#CE1126", secondary: "#14213D", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/145.png" },
  "marquette": { name: "Marquette", primary: "#003366", secondary: "#FFCC00", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/269.png" },
  "louisville": { name: "Louisville", primary: "#AD0000", secondary: "#000000", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/97.png" },
  "creighton": { name: "Creighton", primary: "#005CA9", secondary: "#FFFFFF", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/156.png" },
  "new-mexico": { name: "New Mexico", primary: "#BA0C2F", secondary: "#A7A8AA", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/167.png" },
  "san-diego-state": { name: "San Diego State", primary: "#A6192E", secondary: "#000000", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/21.png" },
  "uc-san-diego": { name: "UC San Diego", primary: "#182B49", secondary: "#C69214", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/28.png" },
  "yale": { name: "Yale", primary: "#00356B", secondary: "#FFFFFF", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/43.png" },
  "lipscomb": { name: "Lipscomb", primary: "#461D7C", secondary: "#FFC72C", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/288.png" },
  "bryant": { name: "Bryant", primary: "#000000", secondary: "#A89968", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2803.png" },
  "alabama-state": { name: "Alabama State", primary: "#000000", secondary: "#D4A843", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2011.png" },

  // WEST REGION
  "florida": { name: "Florida", primary: "#0021A5", secondary: "#FA4616", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/57.png" },
  "st-johns": { name: "St. John's", primary: "#D41B2C", secondary: "#FFFFFF", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2599.png" },
  "texas-tech": { name: "Texas Tech", primary: "#CC0000", secondary: "#000000", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2641.png" },
  "maryland": { name: "Maryland", primary: "#E03A3E", secondary: "#FFD520", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/120.png" },
  "memphis": { name: "Memphis", primary: "#003087", secondary: "#898D8D", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/235.png" },
  "missouri": { name: "Missouri", primary: "#F1B82D", secondary: "#000000", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/142.png" },
  "kansas": { name: "Kansas", primary: "#0051BA", secondary: "#E8000D", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2305.png" },
  "uconn": { name: "UConn", primary: "#000E2F", secondary: "#FFFFFF", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/41.png" },
  "oklahoma": { name: "Oklahoma", primary: "#841617", secondary: "#FDF9D8", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/201.png" },
  "arkansas": { name: "Arkansas", primary: "#9D2235", secondary: "#FFFFFF", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/8.png" },
  "drake": { name: "Drake", primary: "#004477", secondary: "#FFFFFF", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2181.png" },
  "colorado-state": { name: "Colorado State", primary: "#1E4D2B", secondary: "#C8C372", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/36.png" },
  "grand-canyon": { name: "Grand Canyon", primary: "#522D80", secondary: "#FFFFFF", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2253.png" },
  "unc-wilmington": { name: "UNC Wilmington", primary: "#006666", secondary: "#FFD200", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/350.png" },
  "omaha": { name: "Omaha", primary: "#000000", secondary: "#D71920", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2437.png" },
  "norfolk-state": { name: "Norfolk State", primary: "#007A53", secondary: "#F0AB00", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2450.png" },

  // EAST REGION
  "duke": { name: "Duke", primary: "#003087", secondary: "#FFFFFF", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/150.png" },
  "alabama": { name: "Alabama", primary: "#9E1B32", secondary: "#FFFFFF", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/333.png" },
  "wisconsin": { name: "Wisconsin", primary: "#C5050C", secondary: "#FFFFFF", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/275.png" },
  "arizona": { name: "Arizona", primary: "#CC0033", secondary: "#003366", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/12.png" },
  "oregon": { name: "Oregon", primary: "#154733", secondary: "#FEE123", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2483.png" },
  "byu": { name: "BYU", primary: "#002E5D", secondary: "#FFFFFF", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/252.png" },
  "saint-marys": { name: "Saint Mary's", primary: "#D50032", secondary: "#00257A", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2608.png" },
  "mississippi-state": { name: "Mississippi State", primary: "#660000", secondary: "#FFFFFF", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/344.png" },
  "baylor": { name: "Baylor", primary: "#154734", secondary: "#FFB81C", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/239.png" },
  "vanderbilt": { name: "Vanderbilt", primary: "#866D4B", secondary: "#000000", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/238.png" },
  "vcu": { name: "VCU", primary: "#000000", secondary: "#F8B800", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2670.png" },
  "liberty": { name: "Liberty", primary: "#002D62", secondary: "#C41230", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2335.png" },
  "akron": { name: "Akron", primary: "#041E42", secondary: "#A89968", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2006.png" },
  "montana": { name: "Montana", primary: "#6C1D45", secondary: "#A9B0B7", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/149.png" },
  "robert-morris": { name: "Robert Morris", primary: "#14234B", secondary: "#C8102E", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2523.png" },
  "american": { name: "American", primary: "#C41230", secondary: "#00205C", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/44.png" },

  // MIDWEST REGION
  "houston": { name: "Houston", primary: "#C8102E", secondary: "#FFFFFF", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/248.png" },
  "tennessee": { name: "Tennessee", primary: "#FF8200", secondary: "#FFFFFF", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2633.png" },
  "kentucky": { name: "Kentucky", primary: "#0033A0", secondary: "#FFFFFF", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/96.png" },
  "purdue": { name: "Purdue", primary: "#CEB888", secondary: "#000000", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2509.png" },
  "clemson": { name: "Clemson", primary: "#F56600", secondary: "#522D80", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/228.png" },
  "illinois": { name: "Illinois", primary: "#E84A27", secondary: "#13294B", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/356.png" },
  "ucla": { name: "UCLA", primary: "#2D68C4", secondary: "#F2A900", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/26.png" },
  "gonzaga": { name: "Gonzaga", primary: "#002967", secondary: "#C8102E", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2250.png" },
  "georgia": { name: "Georgia", primary: "#BA0C2F", secondary: "#000000", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/61.png" },
  "utah-state": { name: "Utah State", primary: "#0F2439", secondary: "#FFFFFF", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/328.png" },
  "texas": { name: "Texas", primary: "#BF5700", secondary: "#FFFFFF", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/251.png" },
  "mcneese": { name: "McNeese", primary: "#005CA9", secondary: "#FFC72C", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2377.png" },
  "high-point": { name: "High Point", primary: "#330072", secondary: "#FFFFFF", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2272.png" },
  "troy": { name: "Troy", primary: "#8B2332", secondary: "#000000", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2653.png" },
  "wofford": { name: "Wofford", primary: "#886B25", secondary: "#000000", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2747.png" },
  "siu-edwardsville": { name: "SIU Edwardsville", primary: "#CC0000", secondary: "#000000", logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2565.png" },
};

// Default Pick N Roll brand color (orange)
export const DEFAULT_TEAM_COLOR: TeamColor = {
  name: "Pick N Roll",
  primary: "#f97316",
  secondary: "#ea580c",
  logo: "",
};

// Get team color by slug, fallback to default orange
export function getTeamColor(slug: string | null | undefined): TeamColor {
  if (!slug) return DEFAULT_TEAM_COLOR;
  return TEAM_COLORS[slug] ?? DEFAULT_TEAM_COLOR;
}

// Sorted list for the picker UI
export const TEAM_LIST = Object.entries(TEAM_COLORS)
  .map(([slug, team]) => ({ slug, ...team }))
  .sort((a, b) => a.name.localeCompare(b.name));
