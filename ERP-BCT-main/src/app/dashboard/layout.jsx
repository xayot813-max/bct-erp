// HECH QAYERGA "use client" YO'Q
import { cookies } from "next/headers";
import DashboardHeader from "./_components/DashboardHeader";
import { AuthProvider } from "@/components/providers/AuthProvider";
import AuthGate from "@/components/providers/AuthGate";

export default async function DashboardLayout({ children }) {
  const cookieStore = await cookies();
  const initialUserData = cookieStore.get("authData")?.value || null;

  return (
    <div className="dashboard-shell">
      <AuthProvider initialUserData={initialUserData}>
        <DashboardHeader />
        <div className="min-h-screen bg-[var(--app-bg)] pt-16">
          <AuthGate>
            {children}
          </AuthGate>
        </div>
      </AuthProvider>
    </div>
  );
}
