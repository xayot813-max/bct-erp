// HECH QAYERGA "use client" YO'Q
import { cookies } from "next/headers";
import { AuthProvider } from "@/components/providers/AuthProvider";
import DashboardHeader from "./_components/DashboardHeader";
import AuthGate from "@/components/providers/AuthGate";
import PermissionGate from "@/components/providers/PermissionGate";
import ScrollRestorationReset from "@/components/shared/ScrollRestorationReset";

export default async function DashboardLayout({ children }) {
  const cookieStore = await cookies();
  const initialUserData = cookieStore.get("authData")?.value || null;

  return (
    <div className="dashboard-shell">
      <AuthProvider initialUserData={initialUserData}>
        <ScrollRestorationReset />
        <DashboardHeader />
        <div data-route-scroll-container className="min-h-screen bg-[var(--app-bg)] pt-16">
          <AuthGate>
            <PermissionGate>{children}</PermissionGate>
          </AuthGate>
        </div>
      </AuthProvider>
    </div>
  );
}
