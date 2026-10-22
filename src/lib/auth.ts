import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { findUserByEmail } from "@/lib/user-email";
import type { Adapter } from "next-auth/adapters";

const ROLE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await findUserByEmail(credentials.email);

        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          favoriteTeam: user.favoriteTeam,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.favoriteTeam = (user as { favoriteTeam?: string | null }).favoriteTeam;
        token.refreshedAt = Date.now();
      }
      // Re-read role periodically so admin promotions/demotions apply without signing out
      const isStale = !token.refreshedAt || Date.now() - token.refreshedAt > ROLE_REFRESH_INTERVAL_MS;
      if (token.id && (trigger === "update" || isStale)) {
        const freshUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, favoriteTeam: true },
        });
        token.role = freshUser?.role ?? "USER";
        token.favoriteTeam = freshUser?.favoriteTeam ?? null;
        token.refreshedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.favoriteTeam = token.favoriteTeam as string | null;
      }
      return session;
    },
  },
};
