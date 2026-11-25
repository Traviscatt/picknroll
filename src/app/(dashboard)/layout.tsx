import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Navbar } from "@/components/shared/navbar";
import { MobileTabBar } from "@/components/shared/mobile-tab-bar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Checked on the server so a fresh sign-in never races the client session
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-8 pb-28 md:pb-8">
        {children}
      </main>
      <MobileTabBar />
    </div>
  );
}
