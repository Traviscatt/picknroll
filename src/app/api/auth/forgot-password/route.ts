import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import { APP_URL, passwordResetEmail, sendEmail } from "@/lib/email";
import { findUserByEmail } from "@/lib/user-email";

// POST /api/auth/forgot-password - Request a password reset
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Always return success to avoid email enumeration
    const user = await findUserByEmail(email);

    if (user) {
      // Invalidate any existing tokens for this email
      await db.passwordResetToken.updateMany({
        where: { email: user.email, used: false },
        data: { used: true },
      });

      // Create a new reset token (valid for 1 hour)
      const token = randomBytes(32).toString("hex");
      await db.passwordResetToken.create({
        data: {
          token,
          email: user.email,
          expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      const { subject, html } = passwordResetEmail(user.name, `${APP_URL}/reset-password?token=${token}`);
      const result = await sendEmail({ to: user.email, subject, html });
      if (!result.success) {
        console.error("Password reset email failed:", result.error);
      }
    }

    return NextResponse.json({
      message: "If an account with that email exists, we've sent a password reset link.",
    });
  } catch (error) {
    console.error("Error requesting password reset:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
