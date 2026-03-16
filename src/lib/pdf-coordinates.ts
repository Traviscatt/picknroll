// Coordinate mapping for overlaying bracket picks on the NCAA bracket PDF template
// PDF dimensions: 792 x 612 (US Letter landscape)
// PDF coordinate system: (0,0) is BOTTOM-LEFT, y increases UPWARD
//
// Layout assumption (standard NCAA bracket):
// - Top-left quadrant: East region (R1 → R2 → S16 → E8 progressing right)
// - Bottom-left quadrant: South region (same progression)
// - Top-right quadrant: West region (R1 → R2 → S16 → E8 progressing left)
// - Bottom-right quadrant: Midwest region (same progression)
// - Center: Final Four + Championship
//
// For each game, we draw choices[0] (the user's #1 pick) at the mapped position.
// Adjust coordinates below to match your specific PDF template.

export interface SlotPosition {
  x: number;
  y: number;
  fontSize?: number;
  align?: "left" | "right";
}

// ── Vertical positions ──────────────────────────────────────────
// Top regions (East / West): y from ~575 down to ~335
// Bottom regions (South / Midwest): y from ~275 down to ~35
// Spacing: ~30 pts between R1 games

const TOP_R1 = [572, 541, 510, 479, 448, 417, 386, 355];
const TOP_R2 = [557, 495, 433, 371];
const TOP_S16 = [526, 402];
const TOP_E8 = [464];

const BOT_R1 = [272, 241, 210, 179, 148, 117, 86, 55];
const BOT_R2 = [257, 195, 133, 71];
const BOT_S16 = [226, 102];
const BOT_E8 = [164];

// ── Horizontal positions ────────────────────────────────────────
// Left side rounds progress rightward
const LEFT_X = { r1: 68, r2: 152, s16: 236, e8: 318 };
// Right side rounds progress leftward (text right-aligned)
const RIGHT_X = { r1: 724, r2: 640, s16: 556, e8: 474 };
// Center
const CENTER_X = 396;

// ── Font sizes by round ─────────────────────────────────────────
const FONT_SIZES = { r1: 5.5, r2: 6, s16: 6.5, e8: 7, ff: 7.5, champ: 8 };

// ── Build position map ──────────────────────────────────────────
function buildRegionPositions(
  region: string,
  xConfig: typeof LEFT_X,
  r1y: number[],
  r2y: number[],
  s16y: number[],
  e8y: number[],
  align: "left" | "right"
): Record<string, SlotPosition> {
  const map: Record<string, SlotPosition> = {};

  // Round 1 — 8 games
  for (let g = 0; g < 8; g++) {
    map[`${region}-r1-g${g + 1}`] = { x: xConfig.r1, y: r1y[g], fontSize: FONT_SIZES.r1, align };
  }
  // Round 2 — 4 games
  for (let g = 0; g < 4; g++) {
    map[`${region}-r2-g${g + 1}`] = { x: xConfig.r2, y: r2y[g], fontSize: FONT_SIZES.r2, align };
  }
  // Sweet 16 — 2 games
  for (let g = 0; g < 2; g++) {
    map[`${region}-r3-g${g + 1}`] = { x: xConfig.s16, y: s16y[g], fontSize: FONT_SIZES.s16, align };
  }
  // Elite 8 — 1 game
  map[`${region}-r4-g1`] = { x: xConfig.e8, y: e8y[0], fontSize: FONT_SIZES.e8, align };

  return map;
}

export const BRACKET_POSITIONS: Record<string, SlotPosition> = {
  // East — top-left, text left-aligned
  ...buildRegionPositions("East", LEFT_X, TOP_R1, TOP_R2, TOP_S16, TOP_E8, "left"),

  // South — bottom-left, text left-aligned
  ...buildRegionPositions("South", LEFT_X, BOT_R1, BOT_R2, BOT_S16, BOT_E8, "left"),

  // West — top-right, text right-aligned
  ...buildRegionPositions("West", RIGHT_X, TOP_R1, TOP_R2, TOP_S16, TOP_E8, "right"),

  // Midwest — bottom-right, text right-aligned
  ...buildRegionPositions("Midwest", RIGHT_X, BOT_R1, BOT_R2, BOT_S16, BOT_E8, "right"),

  // Final Four
  "final-four-r5-g1": { x: CENTER_X - 20, y: 340, fontSize: FONT_SIZES.ff, align: "left" },
  "final-four-r5-g2": { x: CENTER_X + 20, y: 340, fontSize: FONT_SIZES.ff, align: "right" },

  // Championship
  "championship-r6-g1": { x: CENTER_X, y: 306, fontSize: FONT_SIZES.champ, align: "left" },
};
