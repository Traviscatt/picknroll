import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, RGB } from "pdf-lib";

// ── Team lookup ─────────────────────────────────────────────────
const REGIONS = ["East", "South", "West", "Midwest"] as const;
const TEAM_NAMES: string[] = [
  "Duke", "UConn", "Michigan State", "Kansas", "St. John's", "Louisville",
  "UCLA", "Ohio State", "TCU", "UCF", "South Florida", "Northern Iowa",
  "Cal Baptist", "North Dakota State", "Furman", "Siena",
  "Florida", "Houston", "Illinois", "Nebraska", "Vanderbilt", "North Carolina",
  "Saint Mary's", "Clemson", "Iowa", "Texas A&M", "VCU", "McNeese",
  "Troy", "Penn", "Idaho", "Prairie View A&M/Lehigh",
  "Arizona", "Purdue", "Gonzaga", "Arkansas", "Wisconsin", "BYU",
  "Miami (FL)", "Villanova", "Utah State", "Missouri", "Texas/NC State", "High Point",
  "Hawaii", "Kennesaw State", "Queens", "LIU",
  "Michigan", "Iowa State", "Virginia", "Alabama", "Texas Tech", "Tennessee",
  "Kentucky", "Georgia", "Saint Louis", "Santa Clara", "Miami (OH)/SMU", "Akron",
  "Hofstra", "Wright State", "Tennessee State", "UMBC/Howard",
];

const teamMap = new Map<string, { name: string; seed: number }>();
let idx = 0;
for (const region of REGIONS) {
  for (let seed = 1; seed <= 16; seed++) {
    teamMap.set(`${region.toLowerCase()}-${seed}`, {
      name: TEAM_NAMES[idx] || `Team ${idx + 1}`,
      seed,
    });
    idx++;
  }
}

function getSeed(teamId: string): number {
  return teamMap.get(teamId)?.seed ?? 0;
}

interface PickData {
  gameId: string;
  round: number;
  choices: string[];
}

// ── Choices & points per round ───────────────────────────────────
const ROUND_CONFIG: Record<number, { choices: number; points: number[] }> = {
  1: { choices: 1, points: [2] },
  2: { choices: 1, points: [5] },
  3: { choices: 2, points: [10, 5] },
  4: { choices: 3, points: [15, 10, 5] },
  5: { choices: 4, points: [25, 15, 10, 5] },
  6: { choices: 5, points: [35, 25, 15, 10, 5] },
};

// ── Colors ──────────────────────────────────────────────────────
const CLR = {
  headerBg: rgb(0.1, 0.1, 0.35),
  headerTxt: rgb(1, 1, 1),
  regionBg: rgb(0.15, 0.25, 0.55),
  regionTxt: rgb(1, 1, 1),
  roundLbl: rgb(0.45, 0.45, 0.45),
  line: rgb(0.75, 0.75, 0.75),
  seedBg: rgb(0.91, 0.91, 0.91),
  seedTxt: rgb(0.35, 0.35, 0.35),
  teamTxt: rgb(0.1, 0.1, 0.1),
  pickTxt: rgb(0.0, 0.18, 0.55),
  champBg: rgb(1, 0.96, 0.85),
  champBdr: rgb(0.82, 0.62, 0.08),
  empty: rgb(0.85, 0.85, 0.85),
  slotBg: rgb(0.98, 0.98, 0.98),
  pickBg: rgb(0.92, 0.95, 1),
  ffBoxBg: rgb(0.97, 0.97, 1),
  ffBoxBdr: rgb(0.82, 0.82, 0.92),
};

// ── Drawing helpers ─────────────────────────────────────────────
function fillRect(p: PDFPage, x: number, y: number, w: number, h: number, c: RGB, bc?: RGB) {
  p.drawRectangle({ x, y, width: w, height: h, color: c });
  if (bc) p.drawRectangle({ x, y, width: w, height: h, borderColor: bc, borderWidth: 0.5 });
}

// Draw a single team row within a slot
function drawTeamRow(
  p: PDFPage, x: number, y: number, w: number, rowH: number,
  teamId: string, rank: number, pts: number,
  font: PDFFont, bold: PDFFont, isFirst: boolean
) {
  const info = teamMap.get(teamId);
  const name = info?.name || teamId;
  const seed = getSeed(teamId);

  // Row background — first choice gets highlight
  const bg = isFirst ? CLR.pickBg : CLR.slotBg;
  fillRect(p, x, y, w, rowH, bg);
  p.drawRectangle({ x, y, width: w, height: rowH, borderColor: CLR.line, borderWidth: 0.3 });

  // Rank number
  const rankW = 8;
  const rankStr = `${rank}.`;
  const rankFs = 4.5;
  p.drawText(rankStr, {
    x: x + 1, y: y + (rowH - rankFs) / 2,
    size: rankFs, font: bold, color: isFirst ? CLR.pickTxt : CLR.roundLbl,
  });

  // Seed badge
  const seedW = 12;
  const seedX = x + rankW;
  fillRect(p, seedX, y + 1, seedW, rowH - 2, CLR.seedBg);
  const ss = String(seed);
  const sfs = 4.5;
  p.drawText(ss, {
    x: seedX + (seedW - font.widthOfTextAtSize(ss, sfs)) / 2,
    y: y + (rowH - sfs) / 2, size: sfs, font, color: CLR.seedTxt,
  });

  // Team name
  const nf = isFirst ? bold : font;
  const nc = isFirst ? CLR.pickTxt : CLR.teamTxt;
  const nameX = seedX + seedW + 2;
  const ptsLblW = 20; // space for points label on right
  const maxNameW = w - rankW - seedW - ptsLblW - 6;
  const fs = name.length > 16 ? 4.5 : name.length > 12 ? 5 : 5.5;
  let disp = name;
  while (nf.widthOfTextAtSize(disp, fs) > maxNameW && disp.length > 3) disp = disp.slice(0, -1);
  if (disp !== name) disp += "..";

  p.drawText(disp, {
    x: nameX, y: y + (rowH - fs) / 2,
    size: fs, font: nf, color: nc,
  });

  // Points label on right
  const ptsStr = `${pts}pt`;
  const ptsFs = 3.5;
  const ptsW = font.widthOfTextAtSize(ptsStr, ptsFs);
  p.drawText(ptsStr, {
    x: x + w - ptsW - 2, y: y + (rowH - ptsFs) / 2,
    size: ptsFs, font, color: CLR.roundLbl,
  });
}

// Draw a multi-choice game slot (stacked rows for all choices)
function drawGameSlot(
  p: PDFPage, x: number, y: number, w: number, totalH: number,
  choices: string[], round: number,
  font: PDFFont, bold: PDFFont
) {
  const cfg = ROUND_CONFIG[round] || { choices: 1, points: [0] };
  const numChoices = choices.length || cfg.choices;
  const rowH = Math.min(totalH / Math.max(numChoices, 1), 11);

  // Draw from top to bottom (y is bottom-left, so top row starts highest)
  for (let i = 0; i < choices.length; i++) {
    const rowY = y + totalH - (i + 1) * rowH;
    const pts = cfg.points[i] ?? 0;
    drawTeamRow(p, x, rowY, w, rowH, choices[i], i + 1, pts, font, bold, i === 0);
  }

  // Draw empty rows for unfilled choices
  for (let i = choices.length; i < cfg.choices; i++) {
    const rowY = y + totalH - (i + 1) * rowH;
    p.drawRectangle({ x, y: rowY, width: w, height: rowH, borderColor: CLR.empty, borderWidth: 0.3 });
    const rankStr = `${i + 1}.`;
    p.drawText(rankStr, { x: x + 1, y: rowY + (rowH - 4) / 2, size: 4, font, color: CLR.empty });
  }
}

function drawEmpty(p: PDFPage, x: number, y: number, w: number, h: number, font: PDFFont) {
  p.drawRectangle({ x, y, width: w, height: h, borderColor: CLR.empty, borderWidth: 0.5 });
  p.drawText("—", { x: x + w / 2 - 2, y: y + 3, size: 5, font, color: CLR.empty });
}

// ── Main bracket renderer ───────────────────────────────────────
function drawBracket(
  page: PDFPage, picks: PickData[],
  font: PDFFont, bold: PDFFont,
  bracketName: string, entryName: string, tiebreaker: number | null
) {
  const W = 792, H = 612;

  // Header bar
  fillRect(page, 0, H - 28, W, 28, CLR.headerBg);
  const title = "NCAA March Madness 2026";
  page.drawText(title, {
    x: (W - bold.widthOfTextAtSize(title, 11)) / 2, y: H - 20,
    size: 11, font: bold, color: CLR.headerTxt,
  });
  page.drawText(`${bracketName}  -  ${entryName}`, {
    x: 8, y: H - 19, size: 6, font, color: rgb(0.7, 0.7, 0.85),
  });

  // Layout constants
  const MT = H - 32, MB = 12, ML = 4, MR = 4;
  const CG = 230;
  const bW = (W - ML - MR - CG) / 2;
  const rH = (MT - MB - 8) / 2;
  const ROW_H = 10; // height per choice row
  const COL_W = bW / 4;

  // Pick lookup — store ALL choices
  const pm = new Map<string, { choices: string[]; round: number }>();
  for (const pk of picks) if (pk.choices.length > 0) pm.set(pk.gameId, { choices: pk.choices, round: pk.round });

  // ── Draw one region ─────────────────────────────────────────
  function drawRegion(
    region: string, ox: number, oy: number, w: number, h: number,
    dir: "ltr" | "rtl"
  ) {
    // Region label centered in bracket area
    const rl = `${region} Region`;
    const rlFs = 9;
    page.drawText(rl, {
      x: ox + (w - bold.widthOfTextAtSize(rl, rlFs)) / 2,
      y: oy + h / 2 - rlFs / 2, size: rlFs, font: bold, color: rgb(0.85, 0.88, 0.95),
    });

    const cTop = oy + h - 3;
    const cH = cTop - oy - 2;
    const rounds = [
      { n: 1, l: "R1", g: 8 },
      { n: 2, l: "R2", g: 4 },
      { n: 3, l: "S16", g: 2 },
      { n: 4, l: "E8", g: 1 },
    ];

    const slotPos: { x: number; y: number; w: number; h: number }[][] = [];

    for (let ri = 0; ri < rounds.length; ri++) {
      const rd = rounds[ri];
      const ci = dir === "ltr" ? ri : 3 - ri;
      const cx = ox + ci * COL_W;
      const sW = COL_W - 6;
      const gap = cH / rd.g;
      const cfg = ROUND_CONFIG[rd.n] || { choices: 1, points: [0] };
      const slotH = Math.min(cfg.choices * ROW_H, gap - 4);
      const positions: { x: number; y: number; w: number; h: number }[] = [];

      // Round label with choice count
      const rlText = cfg.choices > 1 ? `${rd.l} (${cfg.choices}x)` : rd.l;
      page.drawText(rlText, {
        x: cx + (COL_W - font.widthOfTextAtSize(rlText, 4.5)) / 2,
        y: cTop - 7, size: 4.5, font, color: CLR.roundLbl,
      });

      for (let g = 0; g < rd.g; g++) {
        const sy = cTop - 12 - g * gap - gap / 2 - slotH / 2;
        const sx = cx + 3;
        const gid = `${region}-r${rd.n}-g${g + 1}`;
        const pick = pm.get(gid);

        if (pick) {
          drawGameSlot(page, sx, sy, sW, slotH, pick.choices, rd.n, font, bold);
        } else {
          drawEmpty(page, sx, sy, sW, slotH, font);
        }

        positions.push({ x: sx, y: sy, w: sW, h: slotH });
      }
      slotPos.push(positions);
    }

    // Connector lines between rounds
    for (let ri = 0; ri < rounds.length - 1; ri++) {
      const curr = slotPos[ri];
      const next = slotPos[ri + 1];
      for (let g = 0; g < curr.length; g++) {
        const ni = Math.floor(g / 2);
        const fy = curr[g].y + curr[g].h / 2;
        const ty = next[ni].y + next[ni].h / 2;
        if (dir === "ltr") {
          const sx = curr[g].x + curr[g].w;
          const ex = next[ni].x;
          const mx = (sx + ex) / 2;
          page.drawLine({ start: { x: sx, y: fy }, end: { x: mx, y: fy }, thickness: 0.4, color: CLR.line });
          page.drawLine({ start: { x: mx, y: fy }, end: { x: mx, y: ty }, thickness: 0.4, color: CLR.line });
          page.drawLine({ start: { x: mx, y: ty }, end: { x: ex, y: ty }, thickness: 0.4, color: CLR.line });
        } else {
          const sx = curr[g].x;
          const ex = next[ni].x + next[ni].w;
          const mx = (sx + ex) / 2;
          page.drawLine({ start: { x: sx, y: fy }, end: { x: mx, y: fy }, thickness: 0.4, color: CLR.line });
          page.drawLine({ start: { x: mx, y: fy }, end: { x: mx, y: ty }, thickness: 0.4, color: CLR.line });
          page.drawLine({ start: { x: mx, y: ty }, end: { x: ex, y: ty }, thickness: 0.4, color: CLR.line });
        }
      }
    }
  }

  // ── Render 4 regions ────────────────────────────────────────
  const leftX = ML;
  const rightX = W - MR - bW;
  const topY = MB + rH + 4;
  const botY = MB;

  drawRegion("East", leftX, topY, bW, rH, "ltr");
  drawRegion("South", leftX, botY, bW, rH, "ltr");
  drawRegion("West", rightX, topY, bW, rH, "rtl");
  drawRegion("Midwest", rightX, botY, bW, rH, "rtl");

  // ── Final Four & Championship (center) ──────────────────────
  const ffSlotH = 4 * ROW_H; // 4 choices for FF
  const chSlotH = 5 * ROW_H; // 5 choices for championship
  const cx = W / 2 - CG / 2;
  const centerY = H / 2;
  const ffHalfW = (CG - 10) / 2; // each FF semi gets half the center width
  const champW = CG - 20; // champion nearly full center width

  // "Final Four" title
  const ffLbl = "Final Four";
  page.drawText(ffLbl, {
    x: W / 2 - bold.widthOfTextAtSize(ffLbl, 9) / 2,
    y: centerY + ffSlotH + 30, size: 9, font: bold, color: CLR.regionBg,
  });

  // FF semis side by side at top
  const ffTopY = centerY + 14;

  // Left: East vs South semifinal (4 choices)
  const sf1X = cx + 2;
  page.drawText("East vs South (4x)", { x: sf1X, y: ffTopY + ffSlotH + 2, size: 4.5, font, color: CLR.roundLbl });
  const ff1 = pm.get("final-four-r5-g1");
  if (ff1) drawGameSlot(page, sf1X, ffTopY, ffHalfW, ffSlotH, ff1.choices, 5, font, bold);
  else drawEmpty(page, sf1X, ffTopY, ffHalfW, ffSlotH, font);

  // Right: West vs Midwest semifinal (4 choices)
  const sf2X = cx + CG - ffHalfW - 2;
  page.drawText("West vs Midwest (4x)", { x: sf2X, y: ffTopY + ffSlotH + 2, size: 4.5, font, color: CLR.roundLbl });
  const ff2 = pm.get("final-four-r5-g2");
  if (ff2) drawGameSlot(page, sf2X, ffTopY, ffHalfW, ffSlotH, ff2.choices, 5, font, bold);
  else drawEmpty(page, sf2X, ffTopY, ffHalfW, ffSlotH, font);

  // Championship below with gap (5 choices)
  const chX = W / 2 - champW / 2;
  const chY = ffTopY - chSlotH - 26; // 26px gap between FF and champ
  const champBoxH = chSlotH + 22;
  fillRect(page, chX - 4, chY - 4, champW + 8, champBoxH, CLR.champBg, CLR.champBdr);
  const chLbl = "CHAMPION (5x)";
  page.drawText(chLbl, {
    x: W / 2 - bold.widthOfTextAtSize(chLbl, 7) / 2,
    y: chY + chSlotH + 4, size: 7, font: bold, color: CLR.champBdr,
  });
  const ch = pm.get("championship-r6-g1");
  if (ch) drawGameSlot(page, chX, chY, champW, chSlotH, ch.choices, 6, font, bold);
  else drawEmpty(page, chX, chY, champW, chSlotH, font);

  // Tiebreaker below champion
  if (tiebreaker !== null) {
    const tb = `Tiebreaker: ${tiebreaker}`;
    page.drawText(tb, {
      x: W / 2 - font.widthOfTextAtSize(tb, 5.5) / 2,
      y: chY - 16, size: 5.5, font, color: CLR.seedTxt,
    });
  }

  // Footer
  const ft = "Generated by PickNRoll  -  picknroll.net";
  page.drawText(ft, {
    x: (W - font.widthOfTextAtSize(ft, 5)) / 2, y: 3,
    size: 5, font, color: rgb(0.6, 0.6, 0.6),
  });
}

// ── API Route ───────────────────────────────────────────────────
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const bracket = await db.bracket.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!bracket) {
      return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
    }

    const picks: PickData[] = bracket.picksData
      ? JSON.parse(bracket.picksData)
      : [];

    if (picks.length === 0) {
      return NextResponse.json({ error: "No picks to export" }, { status: 400 });
    }

    // Create PDF from scratch
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([792, 612]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // White background
    page.drawRectangle({ x: 0, y: 0, width: 792, height: 612, color: rgb(1, 1, 1) });

    drawBracket(page, picks, font, bold, bracket.name, bracket.entryName, bracket.tiebreaker);

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${bracket.name.replace(/[^a-zA-Z0-9]/g, "_")}_bracket.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating bracket PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
