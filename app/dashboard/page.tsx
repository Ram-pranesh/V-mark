import { Navbar } from "@/components/navbar";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16">
        <DashboardContent />
      </div>
    </main>
  );
}
