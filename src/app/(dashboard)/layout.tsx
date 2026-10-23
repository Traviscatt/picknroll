import { Navbar } from "@/components/shared/navbar";
import { MobileTabBar } from "@/components/shared/mobile-tab-bar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
