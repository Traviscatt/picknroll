import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { getActualTiebreaker, rankBrackets, SCORED_STATUSES } from "@/lib/scoring-service";

// Share image for a pool's public standings link: pool name and the top five
export const alt = "Pool standings on Pick N Roll";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const pool = await db.pool.findUnique({ where: { viewCode: code }, select: { id: true, name: true, tournamentId: true } });
  const brackets = pool
    ? await db.bracket.findMany({
        where: { poolId: pool.id, status: { in: SCORED_STATUSES } },
        select: { id: true, entryName: true, totalScore: true, bonusScore: true, tiebreaker: true },
      })
    : [];
  const top = pool ? rankBrackets(brackets, await getActualTiebreaker(pool.tournamentId)).slice(0, 5) : [];
  const medal = ["#d4a017", "#9ca3af", "#c2783c"];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: 64, background: "#fcfdfd", color: "#1a1a2e" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: "#29503c" }}>
            Pick<span style={{ color: "#8a8d5f" }}>N</span>Roll
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#6b7280" }}>{brackets.length ? `${brackets.length} entries` : ""}</div>
        </div>
        <div style={{ display: "flex", fontSize: 56, fontWeight: 800, marginTop: 24 }}>{pool?.name ?? "Pool standings"}</div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 32, gap: 14 }}>
          {top.map((b) => (
            <div key={b.id} style={{ display: "flex", alignItems: "center", fontSize: 36, padding: "10px 24px", borderRadius: 16, background: b.rank === 1 ? "#f3f4ec" : "#ffffff", border: "2px solid #e5e7eb" }}>
              <div style={{ display: "flex", width: 72, fontWeight: 800, color: medal[b.rank - 1] ?? "#6b7280" }}>{b.rank}</div>
              <div style={{ display: "flex", flex: 1, fontWeight: 600 }}>{b.entryName.slice(0, 32)}</div>
              <div style={{ display: "flex", fontWeight: 800, color: "#29503c" }}>{b.score}</div>
            </div>
          ))}
          {!top.length && <div style={{ display: "flex", fontSize: 32, color: "#6b7280" }}>Standings appear once brackets lock.</div>}
        </div>
      </div>
    ),
    size
  );
}
