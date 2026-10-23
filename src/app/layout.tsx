import type { Metadata, Viewport } from "next";
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
  description: "Make Every Pick Count. The ultimate NCAA Tournament bracket pool with multi-choice scoring.",
  keywords: ["NCAA", "March Madness", "bracket", "pool", "tournament"],
};

// viewport-fit=cover lets the mobile tab bar pad itself for the iPhone home indicator
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
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
