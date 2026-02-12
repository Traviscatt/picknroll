import { jsPDF } from "jspdf";

// ── Types ────────────────────────────────────────────
interface Team {
  name: string;
  seed: number;
  region: string;
}

// ── R1 seed matchups (standard NCAA bracket order) ───
const R1_SEEDS = [
  [1, 16], [8, 9], [5, 12], [4, 13],
  [6, 11], [3, 14], [7, 10], [2, 15],
];

// ── Layout constants (landscape 11×8.5 inches, 792×612 pts) ──
const PAGE_W = 792;
const PAGE_H = 612;
const MARGIN = 18;

// Slot dimensions
const SLOT_W = 72;
const SLOT_H = 8;
const R1_PAIR_H = 18;  // height per R1 matchup (2 teams)
const FONT_SZ = 5.5;
const TINY = 4.5;
const CONN = 8;         // connector line width between rounds

// Region quadrant origins
const QUAD = {
  South:   { x: MARGIN, y: 28, mirror: false },
  East:    { x: PAGE_W - MARGIN, y: 28, mirror: true },
  West:    { x: MARGIN, y: PAGE_H / 2 + 14, mirror: false },
  Midwest: { x: PAGE_W - MARGIN, y: PAGE_H / 2 + 14, mirror: true },
};

// Vertical space per region bracket
const REGION_H = PAGE_H / 2 - 40;

function drawRegionBracket(
  doc: jsPDF,
  teams: Team[],
  regionName: string,
  ox: number,
  oy: number,
  mirror: boolean,
) {
  const dir = mirror ? -1 : 1;

  // Region label
  const labelX = mirror ? ox - (4 * SLOT_W + 3 * CONN) / 2 : ox + (4 * SLOT_W + 3 * CONN) / 2;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(regionName, labelX, oy - 2, { align: "center" });

  // Calculate slot Y positions for each round
  const gap = (REGION_H - 8 * R1_PAIR_H) / 7;
  const r1Ys: number[] = [];
  for (let i = 0; i < 8; i++) {
    r1Ys.push(oy + i * (R1_PAIR_H + gap));
  }

  const r2Ys = Array.from({ length: 4 }, (_, i) =>
    (r1Ys[i * 2] + r1Ys[i * 2 + 1] + R1_PAIR_H) / 2 - SLOT_H / 2
  );
  const s16Ys = Array.from({ length: 2 }, (_, i) =>
    (r2Ys[i * 2] + r2Ys[i * 2 + 1] + SLOT_H) / 2 - SLOT_H / 2
  );
  const e8Ys = [(s16Ys[0] + s16Ys[1] + SLOT_H) / 2 - SLOT_H / 2];

  // Helper: draw a slot box at (x, y) with text
  const drawSlot = (x: number, y: number, text: string, w = SLOT_W) => {
    if (mirror) {
      doc.rect(x - w, y, w, SLOT_H);
      doc.setFontSize(FONT_SZ);
      doc.setFont("helvetica", "normal");
      doc.text(text, x - w + 1.5, y + SLOT_H - 2);
    } else {
      doc.rect(x, y, w, SLOT_H);
      doc.setFontSize(FONT_SZ);
      doc.setFont("helvetica", "normal");
      doc.text(text, x + 1.5, y + SLOT_H - 2);
    }
  };

  // Helper: draw a horizontal connector from slot edge to next column
  const hLine = (x1: number, y: number, x2: number) => {
    doc.line(x1, y, x2, y);
  };

  // Helper: draw a vertical connector
  const vLine = (x: number, y1: number, y2: number) => {
    doc.line(x, y1, x, y2);
  };

  // Helper: draw points label near connector
  const drawPts = (x: number, y: number, pts: string) => {
    doc.setFontSize(TINY);
    doc.setFont("helvetica", "normal");
    if (mirror) {
      doc.text(pts, x + 1, y - 1);
    } else {
      doc.text(pts, x - 1, y - 1, { align: "right" });
    }
  };

  doc.setLineWidth(0.3);
  doc.setDrawColor(0);

  // ── Round 1: team name slots ──
  const r1x = mirror ? ox : ox;
  for (let i = 0; i < 8; i++) {
    const pair = R1_SEEDS[i];
    const team1 = teams.find(t => t.seed === pair[0]);
    const team2 = teams.find(t => t.seed === pair[1]);
    const y = r1Ys[i];

    drawSlot(r1x, y, team1 ? `${team1.seed} ${team1.name}` : "");
    drawSlot(r1x, y + SLOT_H + 1, team2 ? `${team2.seed} ${team2.name}` : "");

    // Connector from R1 pair to R2
    const slotEdgeX = mirror ? r1x - SLOT_W : r1x + SLOT_W;
    const midY1 = y + SLOT_H;
    const midY2 = y + SLOT_H + 1;
    const connX = slotEdgeX + dir * CONN;

    hLine(slotEdgeX, midY1, connX);
    hLine(slotEdgeX, midY2, connX);
    vLine(connX, midY1, midY2);

    // Points label
    drawPts(connX, midY1, "}2");
  }

  // ── Round 2: blank slots ──
  const r2x = mirror ? ox - SLOT_W - CONN : ox + SLOT_W + CONN;
  for (let i = 0; i < 4; i++) {
    const y = r2Ys[i];
    drawSlot(r2x, y, "");

    // Connector from R2 to S16
    const slotEdgeX = mirror ? r2x - SLOT_W : r2x + SLOT_W;
    const midY = y + SLOT_H / 2;
    const connX = slotEdgeX + dir * CONN;
    hLine(slotEdgeX, midY, connX);

    drawPts(connX, midY, "}5");
  }

  // Vertical connectors for R2 pairs → S16
  for (let i = 0; i < 2; i++) {
    const y1 = r2Ys[i * 2] + SLOT_H / 2;
    const y2 = r2Ys[i * 2 + 1] + SLOT_H / 2;
    const slotEdgeX = mirror ? r2x - SLOT_W : r2x + SLOT_W;
    const connX = slotEdgeX + dir * CONN;
    vLine(connX, y1, y2);
  }

  // ── Sweet 16: blank slots with multi-choice lines ──
  const s16x = mirror ? ox - 2 * (SLOT_W + CONN) : ox + 2 * (SLOT_W + CONN);
  for (let i = 0; i < 2; i++) {
    const y = s16Ys[i];
    // 1st choice slot
    drawSlot(s16x, y, "");

    // Points labels for 2 choices
    const slotEdgeX = mirror ? s16x - SLOT_W : s16x + SLOT_W;
    const connX = slotEdgeX + dir * CONN;

    // 1st choice connector
    hLine(slotEdgeX, y + SLOT_H / 2, connX);
    drawPts(connX, y + SLOT_H / 2, "}10");

    // 2nd choice line below
    const y2 = y + SLOT_H + 2;
    if (mirror) {
      hLine(s16x - SLOT_W, y2, s16x);
    } else {
      hLine(s16x, y2, s16x + SLOT_W);
    }
    const connX2 = (mirror ? s16x - SLOT_W : s16x + SLOT_W) + dir * CONN;
    hLine(mirror ? s16x - SLOT_W : s16x + SLOT_W, y2, connX2);
    drawPts(connX2, y2, "}5");
  }

  // Vertical connectors for S16 pairs → E8
  {
    const y1 = s16Ys[0] + SLOT_H / 2;
    const y2 = s16Ys[1] + SLOT_H / 2;
    const slotEdgeX = mirror ? s16x - SLOT_W : s16x + SLOT_W;
    const connX = slotEdgeX + dir * CONN;
    vLine(connX, y1, y2);
  }

  // ── Elite 8: blank slots with multi-choice lines ──
  const e8x = mirror ? ox - 3 * (SLOT_W + CONN) : ox + 3 * (SLOT_W + CONN);
  {
    const y = e8Ys[0];
    // 1st choice
    drawSlot(e8x, y, "");
    const slotEdgeX = mirror ? e8x - SLOT_W : e8x + SLOT_W;

    // Points labels for 3 choices: 15, 10, 5
    const connX = slotEdgeX + dir * CONN;
    hLine(slotEdgeX, y + SLOT_H / 2, connX);
    drawPts(connX, y + SLOT_H / 2, "}15");

    // 2nd choice
    const y2 = y + SLOT_H + 2;
    if (mirror) {
      hLine(e8x - SLOT_W, y2, e8x);
    } else {
      hLine(e8x, y2, e8x + SLOT_W);
    }
    hLine(mirror ? e8x - SLOT_W : e8x + SLOT_W, y2, connX);
    drawPts(connX, y2, "}10");

    // 3rd choice
    const y3 = y2 + SLOT_H;
    if (mirror) {
      hLine(e8x - SLOT_W, y3, e8x);
    } else {
      hLine(e8x, y3, e8x + SLOT_W);
    }
    hLine(mirror ? e8x - SLOT_W : e8x + SLOT_W, y3, connX);
    drawPts(connX, y3, "}5");
  }

  // Return E8 output position for Final Four connectors
  const e8OutY = e8Ys[0] + SLOT_H / 2;
  const e8OutX = mirror
    ? e8x - SLOT_W - CONN
    : e8x + SLOT_W + CONN;

  return { e8OutX, e8OutY };
}

export function generateBracketPDF(teams: Team[]) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "letter",
  });

  doc.setLineWidth(0.3);
  doc.setDrawColor(0);

  // Title
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("2025 NCAA Tournament Bracket — Pick N Roll", PAGE_W / 2, 14, { align: "center" });

  // Get teams by region
  const getRegionTeams = (region: string) => teams.filter(t => t.region === region);

  // Draw all 4 regions
  const southOut = drawRegionBracket(doc, getRegionTeams("South"), "South", QUAD.South.x, QUAD.South.y, false);
  const eastOut = drawRegionBracket(doc, getRegionTeams("East"), "East", QUAD.East.x, QUAD.East.y, true);
  const westOut = drawRegionBracket(doc, getRegionTeams("West"), "West", QUAD.West.x, QUAD.West.y, false);
  const midwestOut = drawRegionBracket(doc, getRegionTeams("Midwest"), "Midwest", QUAD.Midwest.x, QUAD.Midwest.y, true);

  // ── Center: Final Four + Championship ──
  const centerX = PAGE_W / 2;

  // Top FF: South vs East (but actually per the bracket layout, we need to connect
  // left region E8 output with right region E8 output through FF in center)

  // FF slots - draw simple lines connecting E8 to center
  // Top semifinal
  const topFFy = (QUAD.South.y + QUAD.South.y + REGION_H) / 2;
  const botFFy = (QUAD.West.y + QUAD.West.y + REGION_H) / 2;

  // Draw FF choice lines for top half (South/East → FF semi 2)
  doc.setFontSize(TINY);
  let ffTopLineY = topFFy - 16;
  const ffTopChoices = ["25(", "15(", "10(", "5("];
  for (const c of ffTopChoices) {
    doc.text(c, centerX - 30, ffTopLineY + 3);
    doc.line(centerX - 24, ffTopLineY + 4, centerX + 24, ffTopLineY + 4);
    ffTopLineY += 8;
  }

  // E8 connector lines to center for top regions
  doc.line(southOut.e8OutX, southOut.e8OutY, centerX - 40, southOut.e8OutY);
  doc.line(centerX - 40, southOut.e8OutY, centerX - 40, topFFy);
  doc.line(centerX - 40, topFFy, centerX - 30, topFFy);

  doc.line(eastOut.e8OutX, eastOut.e8OutY, centerX + 40, eastOut.e8OutY);
  doc.line(centerX + 40, eastOut.e8OutY, centerX + 40, topFFy);
  doc.line(centerX + 40, topFFy, centerX + 30, topFFy);

  // Draw FF choice lines for bottom half (West/Midwest → FF semi 1)
  let ffBotLineY = botFFy - 16;
  for (const c of ffTopChoices) {
    doc.text(c, centerX - 30, ffBotLineY + 3);
    doc.line(centerX - 24, ffBotLineY + 4, centerX + 24, ffBotLineY + 4);
    ffBotLineY += 8;
  }

  // E8 connector lines to center for bottom regions
  doc.line(westOut.e8OutX, westOut.e8OutY, centerX - 40, westOut.e8OutY);
  doc.line(centerX - 40, westOut.e8OutY, centerX - 40, botFFy);
  doc.line(centerX - 40, botFFy, centerX - 30, botFFy);

  doc.line(midwestOut.e8OutX, midwestOut.e8OutY, centerX + 40, midwestOut.e8OutY);
  doc.line(centerX + 40, midwestOut.e8OutY, centerX + 40, botFFy);
  doc.line(centerX + 40, botFFy, centerX + 30, botFFy);

  // ── Champion box ──
  const champY = PAGE_H / 2 - 6;
  doc.setLineWidth(0.6);
  doc.rect(centerX - SLOT_W / 2, champY, SLOT_W, SLOT_H + 2);
  doc.setLineWidth(0.3);

  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text("CHAMPION", centerX, champY + SLOT_H + 8, { align: "center" });
  doc.text("1st Choice", centerX, champY + SLOT_H + 14, { align: "center" });

  // Points for champion: }35
  doc.setFontSize(TINY);
  doc.setFont("helvetica", "normal");
  doc.text("}35", centerX + SLOT_W / 2 + 2, champY + SLOT_H / 2 + 1);

  // Connect FF to champion
  doc.line(centerX, topFFy, centerX, champY);
  doc.line(centerX, champY + SLOT_H + 2, centerX, botFFy);

  // ── Champion multi-choice lines (2nd-5th) ──
  const champChoicesY = botFFy + 24;
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text("Champion", centerX, champChoicesY - 4, { align: "center" });
  doc.setFont("helvetica", "normal");

  const champChoices = [
    { label: "2nd Choice 25(", pts: "" },
    { label: "3rd Choice 15(", pts: "" },
    { label: "4th Choice 10(", pts: "" },
    { label: "5th Choice 5(", pts: "" },
  ];

  let cy = champChoicesY;
  for (const c of champChoices) {
    doc.setFontSize(TINY);
    doc.text(c.label, centerX - 36, cy + 3);
    doc.line(centerX - 2, cy + 4, centerX + 36, cy + 4);
    cy += 10;
  }

  // ── Tiebreaker ──
  cy += 4;
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 0, 0);
  doc.text("Tiebreaker", centerX - 36, cy + 3);
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  doc.rect(centerX + 4, cy - 2, 36, 10);

  // ── Name line ──
  doc.setFontSize(TINY);
  doc.setFont("helvetica", "normal");
  doc.text("Name: ____________________", PAGE_W / 2, PAGE_H - 8, { align: "center" });

  return doc;
}
