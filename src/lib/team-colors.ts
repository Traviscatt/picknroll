// NCAA Team Colors + Palette Generator
// Each team has primary + secondary colors; the palette generator derives the themed (frame) CSS vars

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

/** WCAG relative luminance */
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio (1–21) */
export function contrastRatio(a: string, b: string): number {
  const [la, lb] = [relativeLuminance(a), relativeLuminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Darkens a color step by step until it reaches `ratio` against `against` */
function darkenToContrast(hex: string, against: string, ratio: number): string {
  let color = hex;
  for (let i = 0; i < 40 && contrastRatio(color, against) < ratio; i++) color = darken(color, 0.05);
  return color;
}

const INK = "#1a1a2e";
const WHITE = "#ffffff";

/** White or ink, whichever reads better on `bg` */
function textOn(bg: string): string {
  return contrastRatio(WHITE, bg) >= contrastRatio(INK, bg) ? WHITE : INK;
}

// ── Palette generator ───────────────────────────────────────────────
// The favorite-team theme colors only the app's frame (navbar accents, buttons, links, focus rings, light
// tints). Text, gray text, borders, error red, pick-rank colors, and game status colors stay fixed so the
// app reads the same for every team.

export interface ThemePalette {
  background: string;
  primary: string;
  "primary-foreground": string;
  secondary: string;
  "secondary-foreground": string;
  accent: string;
  "accent-foreground": string;
  ring: string;
  "chart-1": string;
  "chart-2": string;
  "sidebar-primary": string;
  "sidebar-primary-foreground": string;
  "sidebar-ring": string;
  "team-secondary": string;
  "team-secondary-foreground": string;
}

/** Every CSS variable a palette may set (cleared before applying a new theme) */
export const THEME_VARS: (keyof ThemePalette)[] = [
  "background", "primary", "primary-foreground", "secondary", "secondary-foreground", "accent", "accent-foreground",
  "ring", "chart-1", "chart-2", "sidebar-primary", "sidebar-primary-foreground", "sidebar-ring", "team-secondary",
  "team-secondary-foreground",
];

export function generatePalette(primaryColor: string, secondaryColor: string): ThemePalette {
  // Primary doubles as link/label text on white and as a button background behind white text: keep it at 4.5:1
  const primary = darkenToContrast(primaryColor, WHITE, 4.5);
  // Secondary is used for small accents on light backgrounds (navbar underline, the logo "N"): a white or
  // near-white team color would vanish, so fall back to a lighter shade of the primary
  const secondary = contrastRatio(secondaryColor, WHITE) >= 2 ? secondaryColor : darkenToContrast(mix(primary, 0.35), WHITE, 2);
  const tint = mix(primary, 0.92);
  const accent = mix(secondary, 0.85);

  return {
    background: mix(primary, 0.985),
    primary,
    "primary-foreground": textOn(primary),
    secondary: tint,
    "secondary-foreground": contrastRatio(primary, tint) >= 4.5 ? primary : INK,
    accent,
    "accent-foreground": contrastRatio(primary, accent) >= 4.5 ? primary : INK,
    ring: primary,
    "chart-1": primary,
    "chart-2": secondary,
    "sidebar-primary": primary,
    "sidebar-primary-foreground": textOn(primary),
    "sidebar-ring": primary,
    "team-secondary": secondary,
    "team-secondary-foreground": textOn(secondary),
  };
}

// ── Curated team colors (2026 field). Override ESPN colors where they differ from the brand;
// teams not listed here get their colors from the imported tournament field (/api/teams).
// ── 2026 NCAA Tournament Teams (68) ─────────────────────────────────

const espn = (id: string) =>
  `https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png`;

export const TEAMS: TeamInfo[] = [
  // EAST REGION
  { slug: "duke", name: "Duke", primary: "#003087", secondary: "#FFFFFF", logo: espn("150") },
  { slug: "uconn", name: "UConn", primary: "#000E2F", secondary: "#E4002B", logo: espn("41") },
  { slug: "michigan-state", name: "Michigan State", primary: "#18453B", secondary: "#FFFFFF", logo: espn("127") },
  { slug: "kansas", name: "Kansas", primary: "#0051BA", secondary: "#E8000D", logo: espn("2305") },
  { slug: "st-johns", name: "St. John's", primary: "#D41B2C", secondary: "#FFFFFF", logo: espn("2599") },
  { slug: "louisville", name: "Louisville", primary: "#AD0000", secondary: "#000000", logo: espn("97") },
  { slug: "ucla", name: "UCLA", primary: "#2D68C4", secondary: "#F2A900", logo: espn("26") },
  { slug: "ohio-state", name: "Ohio State", primary: "#BB0000", secondary: "#666666", logo: espn("194") },
  { slug: "tcu", name: "TCU", primary: "#4D1979", secondary: "#FFFFFF", logo: espn("2628") },
  { slug: "ucf", name: "UCF", primary: "#000000", secondary: "#BA9B37", logo: espn("2116") },
  { slug: "south-florida", name: "South Florida", primary: "#006747", secondary: "#CFC493", logo: espn("58") },
  { slug: "northern-iowa", name: "Northern Iowa", primary: "#4B116F", secondary: "#FFD100", logo: espn("2460") },
  { slug: "cal-baptist", name: "Cal Baptist", primary: "#002855", secondary: "#CF4520", logo: espn("2856") },
  { slug: "north-dakota-state", name: "North Dakota State", primary: "#006633", secondary: "#FFD700", logo: espn("2449") },
  { slug: "furman", name: "Furman", primary: "#582C83", secondary: "#FFFFFF", logo: espn("231") },
  { slug: "siena", name: "Siena", primary: "#006747", secondary: "#FFB81C", logo: espn("2561") },

  // SOUTH REGION
  { slug: "florida", name: "Florida", primary: "#0021A5", secondary: "#FA4616", logo: espn("57") },
  { slug: "houston", name: "Houston", primary: "#C8102E", secondary: "#FFFFFF", logo: espn("248") },
  { slug: "illinois", name: "Illinois", primary: "#E04E39", secondary: "#13294B", logo: espn("356") },
  { slug: "nebraska", name: "Nebraska", primary: "#E41C38", secondary: "#FFFFFF", logo: espn("158") },
  { slug: "vanderbilt", name: "Vanderbilt", primary: "#866D4B", secondary: "#000000", logo: espn("238") },
  { slug: "north-carolina", name: "North Carolina", primary: "#7BAFD4", secondary: "#13294B", logo: espn("153") },
  { slug: "saint-marys", name: "Saint Mary's", primary: "#003DA5", secondary: "#CE1141", logo: espn("2608") },
  { slug: "clemson", name: "Clemson", primary: "#F56600", secondary: "#522D80", logo: espn("228") },
  { slug: "iowa", name: "Iowa", primary: "#FFCD00", secondary: "#000000", logo: espn("2294") },
  { slug: "texas-am", name: "Texas A&M", primary: "#500000", secondary: "#FFFFFF", logo: espn("245") },
  { slug: "vcu", name: "VCU", primary: "#000000", secondary: "#F8B800", logo: espn("2670") },
  { slug: "mcneese", name: "McNeese", primary: "#005DAA", secondary: "#FFC72C", logo: espn("2377") },
  { slug: "troy", name: "Troy", primary: "#841617", secondary: "#000000", logo: espn("2653") },
  { slug: "penn", name: "Penn", primary: "#011F5B", secondary: "#990000", logo: espn("219") },
  { slug: "idaho", name: "Idaho", primary: "#B5985A", secondary: "#000000", logo: espn("70") },
  { slug: "prairie-view", name: "Prairie View A&M", primary: "#4F2D7F", secondary: "#FFB612", logo: espn("2504") },
  { slug: "lehigh", name: "Lehigh", primary: "#653819", secondary: "#FFFFFF", logo: espn("2329") },

  // WEST REGION
  { slug: "arizona", name: "Arizona", primary: "#CC0033", secondary: "#003366", logo: espn("12") },
  { slug: "purdue", name: "Purdue", primary: "#CEB888", secondary: "#000000", logo: espn("2509") },
  { slug: "gonzaga", name: "Gonzaga", primary: "#002967", secondary: "#C8102E", logo: espn("2250") },
  { slug: "arkansas", name: "Arkansas", primary: "#9D2235", secondary: "#FFFFFF", logo: espn("8") },
  { slug: "wisconsin", name: "Wisconsin", primary: "#C5050C", secondary: "#FFFFFF", logo: espn("275") },
  { slug: "byu", name: "BYU", primary: "#002E5D", secondary: "#FFFFFF", logo: espn("252") },
  { slug: "miami-fl", name: "Miami (FL)", primary: "#F47321", secondary: "#005030", logo: espn("2390") },
  { slug: "villanova", name: "Villanova", primary: "#00205B", secondary: "#13B5EA", logo: espn("222") },
  { slug: "utah-state", name: "Utah State", primary: "#003263", secondary: "#FFFFFF", logo: espn("328") },
  { slug: "missouri", name: "Missouri", primary: "#F1B82D", secondary: "#000000", logo: espn("142") },
  { slug: "texas", name: "Texas", primary: "#BF5700", secondary: "#FFFFFF", logo: espn("251") },
  { slug: "nc-state", name: "NC State", primary: "#CC0000", secondary: "#FFFFFF", logo: espn("152") },
  { slug: "high-point", name: "High Point", primary: "#330072", secondary: "#FFFFFF", logo: espn("2272") },
  { slug: "hawaii", name: "Hawaii", primary: "#024731", secondary: "#FFFFFF", logo: espn("62") },
  { slug: "kennesaw-state", name: "Kennesaw State", primary: "#FDBB30", secondary: "#231F20", logo: espn("338") },
  { slug: "queens", name: "Queens", primary: "#002D72", secondary: "#A89968", logo: espn("693") },
  { slug: "liu", name: "LIU", primary: "#003B6F", secondary: "#FFC72C", logo: espn("2344") },

  // MIDWEST REGION
  { slug: "michigan", name: "Michigan", primary: "#00274C", secondary: "#FFCB05", logo: espn("130") },
  { slug: "iowa-state", name: "Iowa State", primary: "#C8102E", secondary: "#F1BE48", logo: espn("66") },
  { slug: "virginia", name: "Virginia", primary: "#232D4B", secondary: "#F84C1E", logo: espn("258") },
  { slug: "alabama", name: "Alabama", primary: "#9E1B32", secondary: "#FFFFFF", logo: espn("333") },
  { slug: "texas-tech", name: "Texas Tech", primary: "#CC0000", secondary: "#000000", logo: espn("2641") },
  { slug: "tennessee", name: "Tennessee", primary: "#FF8200", secondary: "#58595B", logo: espn("2633") },
  { slug: "kentucky", name: "Kentucky", primary: "#0033A0", secondary: "#FFFFFF", logo: espn("96") },
  { slug: "georgia", name: "Georgia", primary: "#BA0C2F", secondary: "#000000", logo: espn("61") },
  { slug: "saint-louis", name: "Saint Louis", primary: "#003DA5", secondary: "#FFFFFF", logo: espn("139") },
  { slug: "santa-clara", name: "Santa Clara", primary: "#862633", secondary: "#FFFFFF", logo: espn("2541") },
  { slug: "miami-oh", name: "Miami (OH)", primary: "#C3142D", secondary: "#FFFFFF", logo: espn("193") },
  { slug: "smu", name: "SMU", primary: "#CC0035", secondary: "#003DA5", logo: espn("2567") },
  { slug: "akron", name: "Akron", primary: "#041E42", secondary: "#A89968", logo: espn("2006") },
  { slug: "hofstra", name: "Hofstra", primary: "#00529B", secondary: "#FFD200", logo: espn("2275") },
  { slug: "wright-state", name: "Wright State", primary: "#007A33", secondary: "#FFD200", logo: espn("2750") },
  { slug: "tennessee-state", name: "Tennessee State", primary: "#003DA5", secondary: "#C8102E", logo: espn("2634") },
  { slug: "umbc", name: "UMBC", primary: "#000000", secondary: "#FFB500", logo: espn("2674") },
  { slug: "howard", name: "Howard", primary: "#003A63", secondary: "#E51937", logo: espn("47") },
];

// ── Helpers ─────────────────────────────────────────────────────────

export function getTeamBySlug(slug: string): TeamInfo | undefined {
  return TEAMS.find((t) => t.slug === slug);
}

export function getAllTeamSlugs(): string[] {
  return TEAMS.map((t) => t.slug);
}

/** URL-safe slug for a school name ("St. John's" -> "st-johns") */
export function teamSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’.()&]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** ESPN team ID from a logo URL like .../500/150.png */
export const espnIdFromLogo = (logo: string | null | undefined) => logo?.match(/\/(\d+)\.png/)?.[1] ?? null;
