import type { Metadata } from "next";
import { db } from "@/lib/db";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const pool = await db.pool.findUnique({ where: { viewCode: code }, select: { name: true } });
  const title = pool ? `${pool.name} standings | Pick N Roll` : "Pool standings | Pick N Roll";
  return { title, openGraph: { title, description: "Live bracket pool standings on Pick N Roll" }, twitter: { card: "summary_large_image", title } };
}

export default function ShareLeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
