import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { authorized: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }

  if (session.user.role !== "ADMIN") {
    return { authorized: false as const, response: NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 }), session: null };
  }

  return { authorized: true as const, response: NextResponse.json({}) as NextResponse, session };
}
