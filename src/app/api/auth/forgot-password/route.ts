import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";

// POST /api/auth/forgot-password - Request a password reset
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Always return success to avoid email enumeration
    const user = await db.user.findUnique({ where: { email } });

    if (user) {
      // Invalidate any existing tokens for this email
      await db.passwordResetToken.updateMany({
        where: { email, used: false },
        data: { used: true },
      });

      // Create a new reset token (valid for 1 hour)
      const token = randomBytes(32).toString("hex");
      await db.passwordResetToken.create({
        data: {
          token,
          email,
          expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      // In production, send an email with the reset link.
      // For now, log the token (useful for development).
      console.log(`Password reset link: /reset-password?token=${token}`);
    }

    return NextResponse.json({
      message: "If an account with that email exists, a reset link has been generated. Check the server console for the link.",
    });
  } catch (error) {
    console.error("Error requesting password reset:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
