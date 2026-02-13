// NCAA Team Colors + Palette Generator
// Each team has primary + secondary colors; the palette generator derives all CSS vars

export interface TeamInfo {
  slug: string;
  name: string;
  primary: string;   // hex
  secondary: string; // hex
  logo: string;      // ESPN CDN URL
}

// ── Color math helpers ──────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

function mix(hex: string, white: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * white,
    g + (255 - g) * white,
    b + (255 - b) * white
  );
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function contrastForeground(bg: string): string {
  return luminance(bg) > 0.55 ? "#1a1a2e" : "#ffffff";
}

// ── Palette generator ───────────────────────────────────────────────

export interface ThemePalette {
  background: string;
  foreground: string;
  card: string;
  "card-foreground": string;
  popover: string;
  "popover-foreground": string;
  primary: string;
  "primary-foreground": string;
  secondary: string;
  "secondary-foreground": string;
  muted: string;
  "muted-foreground": string;
  accent: string;
  "accent-foreground": string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  "chart-1": string;
  "chart-2": string;
  "chart-3": string;
  "chart-4": string;
  "chart-5": string;
  sidebar: string;
  "sidebar-foreground": string;
  "sidebar-primary": string;
  "sidebar-primary-foreground": string;
  "sidebar-accent": string;
  "sidebar-accent-foreground": string;
  "sidebar-border": string;
  "sidebar-ring": string;
  "team-secondary": string;
  "team-secondary-foreground": string;
}

export function generatePalette(primary: string, secondary: string): ThemePalette {
  const bg = mix(primary, 0.97);        // near-white tinted with primary
  const fg = darken(primary, 0.15);     // dark version of primary for text
  const fgColor = luminance(fg) < 0.15 ? fg : darken(primary, 0.4);

  const cardBg = "#ffffff";
  const mutedBg = mix(primary, 0.93);
  const mutedFg = mix(primary, 0.45);
  const accentBg = mix(secondary, 0.85);
  const accentFg = darken(secondary, 0.25);
  const borderColor = mix(primary, 0.82);
  const sidebarBg = mix(primary, 0.95);

  return {
    background: bg,
    foreground: fgColor,
    card: cardBg,
    "card-foreground": fgColor,
    popover: cardBg,
    "popover-foreground": fgColor,
    primary: primary,
    "primary-foreground": contrastForeground(primary),
    secondary: mix(secondary, 0.88),
    "secondary-foreground": darken(secondary, 0.3),
    muted: mutedBg,
    "muted-foreground": mutedFg,
    accent: accentBg,
    "accent-foreground": accentFg,
    destructive: "#b91c1c",
    border: borderColor,
    input: borderColor,
    ring: primary,
    "chart-1": primary,
    "chart-2": secondary,
    "chart-3": mix(primary, 0.4),
    "chart-4": mix(secondary, 0.5),
    "chart-5": darken(primary, 0.2),
    sidebar: sidebarBg,
    "sidebar-foreground": fgColor,
    "sidebar-primary": primary,
    "sidebar-primary-foreground": contrastForeground(primary),
    "sidebar-accent": accentBg,
    "sidebar-accent-foreground": accentFg,
    "sidebar-border": borderColor,
    "sidebar-ring": primary,
    "team-secondary": secondary,
    "team-secondary-foreground": contrastForeground(secondary),
  };
}

// ── 64 NCAA Tournament Teams ────────────────────────────────────────

const espn = (id: string) =>
  `https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png`;

export const TEAMS: TeamInfo[] = [
  { slug: "gonzaga", name: "Gonzaga", primary: "#002967", secondary: "#C8102E", logo: espn("2250") },
  { slug: "houston", name: "Houston", primary: "#C8102E", secondary: "#FFFFFF", logo: espn("248") },
  { slug: "kansas", name: "Kansas", primary: "#0051BA", secondary: "#E8000D", logo: espn("2305") },
  { slug: "purdue", name: "Purdue", primary: "#CEB888", secondary: "#000000", logo: espn("2509") },
  { slug: "uconn", name: "UConn", primary: "#000E2F", secondary: "#E4002B", logo: espn("41") },
  { slug: "tennessee", name: "Tennessee", primary: "#FF8200", secondary: "#58595B", logo: espn("2633") },
  { slug: "duke", name: "Duke", primary: "#003087", secondary: "#FFFFFF", logo: espn("150") },
  { slug: "north-carolina", name: "North Carolina", primary: "#7BAFD4", secondary: "#13294B", logo: espn("153") },
  { slug: "kentucky", name: "Kentucky", primary: "#0033A0", secondary: "#FFFFFF", logo: espn("96") },
  { slug: "alabama", name: "Alabama", primary: "#9E1B32", secondary: "#FFFFFF", logo: espn("333") },
  { slug: "arizona", name: "Arizona", primary: "#CC0033", secondary: "#003366", logo: espn("12") },
  { slug: "baylor", name: "Baylor", primary: "#003015", secondary: "#FFB81C", logo: espn("239") },
  { slug: "michigan-state", name: "Michigan State", primary: "#18453B", secondary: "#FFFFFF", logo: espn("127") },
  { slug: "michigan", name: "Michigan", primary: "#00274C", secondary: "#FFCB05", logo: espn("130") },
  { slug: "auburn", name: "Auburn", primary: "#0C2340", secondary: "#E87722", logo: espn("2") },
  { slug: "iowa-state", name: "Iowa State", primary: "#C8102E", secondary: "#F1BE48", logo: espn("66") },
  { slug: "marquette", name: "Marquette", primary: "#003366", secondary: "#FFCC00", logo: espn("269") },
  { slug: "creighton", name: "Creighton", primary: "#005CA9", secondary: "#FFFFFF", logo: espn("156") },
  { slug: "texas", name: "Texas", primary: "#BF5700", secondary: "#FFFFFF", logo: espn("251") },
  { slug: "villanova", name: "Villanova", primary: "#00205B", secondary: "#13B5EA", logo: espn("222") },
  { slug: "ucla", name: "UCLA", primary: "#2D68C4", secondary: "#F2A900", logo: espn("26") },
  { slug: "arkansas", name: "Arkansas", primary: "#9D2235", secondary: "#FFFFFF", logo: espn("8") },
  { slug: "st-johns", name: "St. John's", primary: "#D41B2C", secondary: "#FFFFFF", logo: espn("2599") },
  { slug: "clemson", name: "Clemson", primary: "#F56600", secondary: "#522D80", logo: espn("228") },
  { slug: "memphis", name: "Memphis", primary: "#003087", secondary: "#898D8D", logo: espn("235") },
  { slug: "texas-tech", name: "Texas Tech", primary: "#CC0000", secondary: "#000000", logo: espn("2641") },
  { slug: "illinois", name: "Illinois", primary: "#E04E39", secondary: "#13294B", logo: espn("356") },
  { slug: "wisconsin", name: "Wisconsin", primary: "#C5050C", secondary: "#FFFFFF", logo: espn("275") },
  { slug: "san-diego-state", name: "San Diego State", primary: "#A6192E", secondary: "#000000", logo: espn("21") },
  { slug: "florida", name: "Florida", primary: "#0021A5", secondary: "#FA4616", logo: espn("57") },
  { slug: "byu", name: "BYU", primary: "#002E5D", secondary: "#FFFFFF", logo: espn("252") },
  { slug: "xavier", name: "Xavier", primary: "#0C2340", secondary: "#9EA2A2", logo: espn("2752") },
  { slug: "indiana", name: "Indiana", primary: "#990000", secondary: "#EEEDEB", logo: espn("84") },
  { slug: "texas-am", name: "Texas A&M", primary: "#500000", secondary: "#FFFFFF", logo: espn("245") },
  { slug: "oregon", name: "Oregon", primary: "#154733", secondary: "#FEE123", logo: espn("2483") },
  { slug: "pitt", name: "Pittsburgh", primary: "#003594", secondary: "#FFB81C", logo: espn("221") },
  { slug: "missouri", name: "Missouri", primary: "#F1B82D", secondary: "#000000", logo: espn("142") },
  { slug: "louisville", name: "Louisville", primary: "#AD0000", secondary: "#000000", logo: espn("97") },
  { slug: "dayton", name: "Dayton", primary: "#CE1141", secondary: "#004B8D", logo: espn("2168") },
  { slug: "new-mexico", name: "New Mexico", primary: "#BA0C2F", secondary: "#63666A", logo: espn("167") },
  { slug: "ole-miss", name: "Ole Miss", primary: "#CE1126", secondary: "#14213D", logo: espn("145") },
  { slug: "cincinnati", name: "Cincinnati", primary: "#E00122", secondary: "#000000", logo: espn("2132") },
  { slug: "colorado-state", name: "Colorado State", primary: "#1E4D2B", secondary: "#C8C372", logo: espn("36") },
  { slug: "drake", name: "Drake", primary: "#004477", secondary: "#FFFFFF", logo: espn("2181") },
  { slug: "colorado", name: "Colorado", primary: "#CFB87C", secondary: "#000000", logo: espn("38") },
  { slug: "maryland", name: "Maryland", primary: "#E03A3E", secondary: "#FFD520", logo: espn("120") },
  { slug: "vanderbilt", name: "Vanderbilt", primary: "#866D4B", secondary: "#000000", logo: espn("238") },
  { slug: "mcneese", name: "McNeese", primary: "#005DAA", secondary: "#FFC72C", logo: espn("2377") },
  { slug: "ucsb", name: "UC Santa Barbara", primary: "#003660", secondary: "#FEBC11", logo: espn("2540") },
  { slug: "yale", name: "Yale", primary: "#00356B", secondary: "#FFFFFF", logo: espn("43") },
  { slug: "grand-canyon", name: "Grand Canyon", primary: "#522398", secondary: "#FFFFFF", logo: espn("2253") },
  { slug: "vermont", name: "Vermont", primary: "#154734", secondary: "#F5A623", logo: espn("261") },
  { slug: "high-point", name: "High Point", primary: "#330072", secondary: "#FFFFFF", logo: espn("2272") },
  { slug: "akron", name: "Akron", primary: "#041E42", secondary: "#A89968", logo: espn("2006") },
  { slug: "lipscomb", name: "Lipscomb", primary: "#3E2583", secondary: "#F7B538", logo: espn("288") },
  { slug: "troy", name: "Troy", primary: "#841617", secondary: "#000000", logo: espn("2653") },
  { slug: "wofford", name: "Wofford", primary: "#886B2C", secondary: "#000000", logo: espn("2747") },
  { slug: "robert-morris", name: "Robert Morris", primary: "#14234B", secondary: "#C41230", logo: espn("2523") },
  { slug: "omaha", name: "Omaha", primary: "#000000", secondary: "#D71920", logo: espn("2437") },
  { slug: "norfolk-state", name: "Norfolk State", primary: "#007A53", secondary: "#F0AB00", logo: espn("2450") },
  { slug: "american", name: "American", primary: "#C41E3A", secondary: "#041E42", logo: espn("44") },
  { slug: "montana", name: "Montana", primary: "#6C1D45", secondary: "#A9B0B7", logo: espn("149") },
  { slug: "siena", name: "Siena", primary: "#006747", secondary: "#FFB81C", logo: espn("2561") },
  { slug: "southeast-missouri", name: "SE Missouri State", primary: "#C8102E", secondary: "#000000", logo: espn("2546") },
];

// ── Helpers ─────────────────────────────────────────────────────────

export function getTeamBySlug(slug: string): TeamInfo | undefined {
  return TEAMS.find((t) => t.slug === slug);
}

export function getAllTeamSlugs(): string[] {
  return TEAMS.map((t) => t.slug);
}
