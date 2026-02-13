import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/session-provider";
import { TeamThemeProvider } from "@/components/providers/team-theme-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pick N Roll | NCAA Tournament Pool",
  description: "From Bracket to Bankroll - Pick N Roll! The ultimate NCAA Tournament bracket pool with multi-choice scoring.",
  keywords: ["NCAA", "March Madness", "bracket", "pool", "tournament"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <TeamThemeProvider>
            {children}
            <Toaster position="top-right" />
          </TeamThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
