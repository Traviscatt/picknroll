// Printable bracket (US Letter, landscape) for a tournament field: blank, or filled with a bracket's picks.
import { PDFDocument, PDFFont, PDFPage, RGB, StandardFonts, rgb } from "pdf-lib";
import { FINAL_FOUR_BONUS, SCORING_RULES } from "@/lib/scoring";
import { R1_SEED_PAIRS } from "@/lib/bracket-validation";
import { createFieldLookup, type TournamentField } from "@/lib/tournament-field";

const hex = (h: string) => rgb(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255);

// App palette (globals.css) and pick-rank colors (pick-colors.ts)
const C = {
  brand: hex("29503c"),
  accent: hex("b9bc91"),
  ink: hex("1a1a2e"),
  muted: hex("6b7280"),
  subtle: hex("a1a1aa"),
  line: hex("d4d4d8"),
  slot: hex("ffffff"),
  panel: hex("f4f5ef"),
  gold: hex("b8860b"),
  goldSoft: hex("fdf8e7"),
  white: hex("ffffff"),
};
const RANK = ["10b981", "f59e0b", "3b82f6", "a855f7", "f43f5e"].map(hex);
const RANK_SOFT = ["ecfdf5", "fffbeb", "eff6ff", "faf5ff", "fff1f2"].map(hex);

const PAGE_W = 792;
const PAGE_H = 612;
const LINE_H = 9.5;
const ROUND_LABELS: Record<number, string> = { 1: "ROUND 1", 2: "ROUND 2", 3: "SWEET 16", 4: "ELITE 8", 5: "FINAL FOUR", 6: "CHAMPIONSHIP" };
const rule = (round: number) => SCORING_RULES.find((r) => r.round === round)!;

export interface BracketPdfOptions {
  field: TournamentField;
  /** Bracket picks; omit for a blank bracket */
  picks?: { gameId: string; choices: string[] }[];
  bracketName?: string;
  entryName?: string;
  tiebreaker?: number | null;
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

function roundRect(page: PDFPage, x: number, y: number, w: number, h: number, r: number, style: { color?: RGB; borderColor?: RGB; borderWidth?: number }) {
  const rr = Math.min(r, w / 2, h / 2);
  const path = `M ${rr} 0 H ${w - rr} Q ${w} 0 ${w} ${rr} V ${h - rr} Q ${w} ${h} ${w - rr} ${h} H ${rr} Q 0 ${h} 0 ${h - rr} V ${rr} Q 0 0 ${rr} 0 Z`;
  page.drawSvgPath(path, { x, y: y + h, ...style });
}

/** Shrinks text to fit, then truncates with an ellipsis */
function fit(font: PDFFont, text: string, maxW: number, size: number, min = 4.2) {
  let s = size;
  while (s > min && font.widthOfTextAtSize(text, s) > maxW) s -= 0.2;
  if (font.widthOfTextAtSize(text, s) <= maxW) return { text, size: s };
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, s) > maxW) t = t.slice(0, -1);
  return { text: `${t.trimEnd()}…`, size: s };
}

function centerText(page: PDFPage, font: PDFFont, text: string, cx: number, y: number, size: number, color: RGB) {
  page.drawText(text, { x: cx - font.widthOfTextAtSize(text, size) / 2, y, size, font, color });
}

interface LineSpec {
  rank?: number; // 1-based choice rank (shows a colored badge)
  seed?: number;
  name?: string;
  points?: number;
  picked?: boolean; // single-choice rounds: the team picked to win
  muted?: boolean;
}

/** One team row inside a slot */
function drawLine(page: PDFPage, f: Fonts, x: number, y: number, w: number, line: LineSpec) {
  const mid = y + LINE_H / 2;
  if (line.picked) page.drawRectangle({ x: x + 0.5, y: y + 0.5, width: w - 1, height: LINE_H - 1, color: RANK_SOFT[0] });
  else if (line.rank && line.name) page.drawRectangle({ x: x + 0.5, y: y + 0.5, width: w - 1, height: LINE_H - 1, color: RANK_SOFT[line.rank - 1] });

  let cursor = x + 2;
  if (line.rank) {
    const r = 2.9;
    const color = RANK[line.rank - 1];
    if (line.name) page.drawCircle({ x: cursor + r, y: mid, size: r, color });
    else page.drawCircle({ x: cursor + r, y: mid, size: r, borderColor: color, borderWidth: 0.6 });
    centerText(page, f.bold, String(line.rank), cursor + r, mid - 1.4, 4, line.name ? C.white : color);
    cursor += 2 * r + 2;
  } else if (line.picked) {
    page.drawRectangle({ x: x + 0.5, y: y + 0.5, width: 1.6, height: LINE_H - 1, color: RANK[0] });
  }

  if (line.seed) {
    page.drawText(String(line.seed), { x: cursor, y: mid - 1.6, size: 4.4, font: f.regular, color: C.muted });
    cursor += 7.5;
  }

  const pointsText = line.points !== undefined ? String(line.points) : "";
  const pointsW = pointsText ? f.regular.widthOfTextAtSize(pointsText, 3.8) + 2 : 0;
  if (pointsText) page.drawText(pointsText, { x: x + w - pointsW, y: mid - 1.4, size: 3.8, font: f.regular, color: C.subtle });

  const maxW = x + w - pointsW - cursor - 1.5;
  if (line.name) {
    const font = line.picked || line.rank === 1 ? f.bold : f.regular;
    const t = fit(font, line.name, maxW, 5.6);
    page.drawText(t.text, { x: cursor, y: mid - t.size * 0.36, size: t.size, font, color: line.muted ? C.subtle : C.ink });
  } else {
    // Write-in line for blank brackets
    page.drawLine({ start: { x: cursor, y: y + 2.4 }, end: { x: cursor + maxW, y: y + 2.4 }, thickness: 0.35, color: C.line });
  }
}

/** A game slot with one row per line, drawn top-down from (x, top) */
function drawSlot(page: PDFPage, f: Fonts, x: number, top: number, w: number, lines: LineSpec[], style?: { border?: RGB }) {
  const h = lines.length * LINE_H;
  roundRect(page, x, top - h, w, h, 2, { color: C.slot, borderColor: style?.border ?? C.line, borderWidth: 0.5 });
  lines.forEach((line, i) => {
    if (i > 0) page.drawLine({ start: { x: x + 1, y: top - i * LINE_H }, end: { x: x + w - 1, y: top - i * LINE_H }, thickness: 0.25, color: C.line });
    drawLine(page, f, x, top - (i + 1) * LINE_H, w, line);
  });
  return { x, y: top - h, w, h };
}

function rankedLines(round: number, choices: string[] | undefined, lookup: ReturnType<typeof createFieldLookup>): LineSpec[] {
  const { choices: count, pointsPerChoice } = rule(round);
  return Array.from({ length: count }, (_, i) => {
    const teamId = choices?.[i];
    const team = teamId ? lookup.get(teamId) : undefined;
    return { rank: count > 1 ? i + 1 : undefined, picked: count === 1 && !!team, seed: team?.seed, name: team?.name ?? (teamId ? teamId : undefined), points: pointsPerChoice[i] };
  });
}

export async function renderBracketPdf({ field, picks, bracketName, entryName, tiebreaker }: BracketPdfOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(bracketName ? `${bracketName} — ${field.tournament.name}` : `${field.tournament.name} bracket`);
  doc.setCreator("Pick N Roll");
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const f: Fonts = { regular: await doc.embedFont(StandardFonts.Helvetica), bold: await doc.embedFont(StandardFonts.HelveticaBold) };
  const lookup = createFieldLookup(field);
  const pickMap = new Map((picks ?? []).map((p) => [p.gameId, p.choices]));
  const regions = field.tournament.regions;

  // ── Header ──
  const HEADER_H = 34;
  page.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: C.brand });
  page.drawRectangle({ x: 0, y: PAGE_H - HEADER_H - 2, width: PAGE_W, height: 2, color: C.accent });
  const wordY = PAGE_H - 22;
  page.drawText("Pick", { x: 14, y: wordY, size: 14, font: f.bold, color: C.white });
  const pickW = f.bold.widthOfTextAtSize("Pick", 14);
  page.drawText("N", { x: 14 + pickW, y: wordY, size: 14, font: f.bold, color: C.accent });
  page.drawText("Roll", { x: 14 + pickW + f.bold.widthOfTextAtSize("N", 14), y: wordY, size: 14, font: f.bold, color: C.white });
  centerText(page, f.bold, field.tournament.name, PAGE_W / 2, PAGE_H - 17, 11, C.white);
  centerText(page, f.regular, "Multi-choice bracket: rank your picks from Sweet 16 on", PAGE_W / 2, PAGE_H - 27, 6, C.accent);
  if (bracketName) {
    const name = fit(f.bold, bracketName, 180, 9);
    page.drawText(name.text, { x: PAGE_W - 14 - f.bold.widthOfTextAtSize(name.text, name.size), y: PAGE_H - 16, size: name.size, font: f.bold, color: C.white });
    if (entryName) {
      const entry = fit(f.regular, entryName, 180, 6.5);
      page.drawText(entry.text, { x: PAGE_W - 14 - f.regular.widthOfTextAtSize(entry.text, entry.size), y: PAGE_H - 26, size: entry.size, font: f.regular, color: C.accent });
    }
  } else {
    page.drawText("Name", { x: PAGE_W - 190, y: PAGE_H - 21, size: 7, font: f.bold, color: C.white });
    page.drawLine({ start: { x: PAGE_W - 168, y: PAGE_H - 22 }, end: { x: PAGE_W - 14, y: PAGE_H - 22 }, thickness: 0.6, color: C.accent });
  }

  // ── Layout ──
  const MARGIN = 10;
  const FOOTER_H = 16;
  const CENTER_W = 196;
  const sideW = (PAGE_W - 2 * MARGIN - CENTER_W) / 2;
  const colW = sideW / 4;
  const slotW = colW - 7;
  const contentTop = PAGE_H - HEADER_H - 8;
  const regionGap = 10;
  const regionH = (contentTop - FOOTER_H - regionGap) / 2;

  const drawRegion = (region: string, ox: number, top: number, mirrored: boolean) => {
    // Region title + round headers
    const titleW = f.bold.widthOfTextAtSize(region.toUpperCase(), 6.5) + 10;
    const titleX = mirrored ? ox + sideW - titleW - 3 : ox + 3;
    roundRect(page, titleX, top - 10, titleW, 10, 5, { color: C.brand });
    centerText(page, f.bold, region.toUpperCase(), titleX + titleW / 2, top - 7.6, 6.5, C.white);

    const gamesTop = top - 24;
    const gamesH = regionH - 26;
    const colX = (ri: number) => ox + (mirrored ? 3 - ri : ri) * colW + 3.5;
    const centers: number[][] = [];

    for (let ri = 0; ri < 4; ri++) {
      const round = ri + 1;
      const label = `${ROUND_LABELS[round]} · ${rule(round).pointsPerChoice.join("/")}`;
      centerText(page, f.bold, label, colX(ri) + slotW / 2, top - 19, 3.9, C.muted);

      const games = 8 >> ri;
      const roundCenters: number[] = [];
      for (let g = 0; g < games; g++) {
        const cy = ri === 0 ? gamesTop - (gamesH / 8) * (g + 0.5) : (centers[ri - 1][2 * g] + centers[ri - 1][2 * g + 1]) / 2;
        const gameId = `${region}-r${round}-g${g + 1}`;
        let lines: LineSpec[];
        if (round === 1) {
          const picked = pickMap.get(gameId)?.[0];
          lines = R1_SEED_PAIRS[g].map((seed) => {
            const team = lookup.get(`${region.toLowerCase()}-${seed}`);
            return { seed, name: team?.name ?? `${seed} seed`, picked: picked === team?.id, muted: !!picked && picked !== team?.id };
          });
        } else {
          lines = rankedLines(round, pickMap.get(gameId), lookup);
        }
        const h = lines.length * LINE_H;
        drawSlot(page, f, colX(ri), cy + h / 2, slotW, lines);
        roundCenters.push(cy);
      }
      centers.push(roundCenters);
    }

    // Connectors
    for (let ri = 0; ri < 3; ri++) {
      const fromEdge = mirrored ? colX(ri) : colX(ri) + slotW;
      const toEdge = mirrored ? colX(ri + 1) + slotW : colX(ri + 1);
      const mid = (fromEdge + toEdge) / 2;
      centers[ri + 1].forEach((ty, g) => {
        const [a, b] = [centers[ri][2 * g], centers[ri][2 * g + 1]];
        for (const fy of [a, b]) page.drawLine({ start: { x: fromEdge, y: fy }, end: { x: mid, y: fy }, thickness: 0.45, color: C.line });
        page.drawLine({ start: { x: mid, y: a }, end: { x: mid, y: b }, thickness: 0.45, color: C.line });
        page.drawLine({ start: { x: mid, y: ty }, end: { x: toEdge, y: ty }, thickness: 0.45, color: C.line });
      });
    }
  };

  const leftX = MARGIN;
  const rightX = PAGE_W - MARGIN - sideW;
  const upperTop = contentTop;
  const lowerTop = contentTop - regionH - regionGap;
  // Left side holds the first Final Four pair, right side the second
  drawRegion(regions[0], leftX, upperTop, false);
  drawRegion(regions[1], leftX, lowerTop, false);
  drawRegion(regions[2], rightX, upperTop, true);
  drawRegion(regions[3], rightX, lowerTop, true);

  // ── Center: Final Four + Championship ──
  const cx = PAGE_W / 2;
  const centerLeft = cx - CENTER_W / 2 + 6;
  const semiW = (CENTER_W - 12 - 8) / 2;
  const midY = (contentTop + FOOTER_H) / 2;

  centerText(page, f.bold, `FINAL FOUR · ${rule(5).pointsPerChoice.join("/")}`, cx, midY + 104, 6.5, C.brand);
  const semiTop = midY + 92;
  [0, 1].forEach((i) => {
    const x = centerLeft + i * (semiW + 8);
    const [a, b] = [regions[i * 2], regions[i * 2 + 1]];
    centerText(page, f.regular, `${a} vs ${b}`, x + semiW / 2, semiTop + 3, 4.6, C.muted);
    drawSlot(page, f, x, semiTop, semiW, rankedLines(5, pickMap.get(`final-four-r5-g${i + 1}`), lookup));
  });

  const champW = CENTER_W - 36;
  const champX = cx - champW / 2;
  const champLines = rankedLines(6, pickMap.get("championship-r6-g1"), lookup);
  const champTop = semiTop - 4 * LINE_H - 28;
  const boxPad = 6;
  const boxH = champLines.length * LINE_H + 24;
  roundRect(page, champX - boxPad, champTop - champLines.length * LINE_H - boxPad, champW + 2 * boxPad, boxH, 4, {
    color: C.goldSoft,
    borderColor: C.gold,
    borderWidth: 0.9,
  });
  centerText(page, f.bold, "CHAMPIONSHIP", cx, champTop + 9, 8, C.gold);
  centerText(page, f.regular, rule(6).pointsPerChoice.join(" / ") + " pts", cx, champTop + 2.5, 4.4, C.gold);
  drawSlot(page, f, champX, champTop, champW, champLines, { border: C.gold });

  // Tiebreaker
  const tbY = champTop - champLines.length * LINE_H - boxPad - 20;
  roundRect(page, champX, tbY, champW, 13, 3, { color: C.panel });
  page.drawText("Tiebreaker: total points in the final", { x: champX + 5, y: tbY + 4.6, size: 5, font: f.regular, color: C.muted });
  if (tiebreaker != null) {
    const tb = String(tiebreaker);
    page.drawText(tb, { x: champX + champW - 6 - f.bold.widthOfTextAtSize(tb, 7), y: tbY + 3.8, size: 7, font: f.bold, color: C.ink });
  } else {
    page.drawLine({ start: { x: champX + champW - 40, y: tbY + 3.5 }, end: { x: champX + champW - 6, y: tbY + 3.5 }, thickness: 0.5, color: C.subtle });
  }

  // ── Footer ──
  page.drawLine({ start: { x: MARGIN, y: FOOTER_H - 2 }, end: { x: PAGE_W - MARGIN, y: FOOTER_H - 2 }, thickness: 0.4, color: C.line });
  const legend =
    SCORING_RULES.map((r) => `${r.roundName} ${r.pointsPerChoice.join("/")}`).join("  ·  ") +
    `  ·  Perfect Final Four +${FINAL_FOUR_BONUS}`;
  page.drawText(`Scoring: ${legend}`, { x: MARGIN, y: 5, size: 5, font: f.regular, color: C.muted });
  const site = "picknroll.net";
  page.drawText(site, { x: PAGE_W - MARGIN - f.bold.widthOfTextAtSize(site, 5.5), y: 5, size: 5.5, font: f.bold, color: C.brand });

  return doc.save();
}
