// HECH QAYERGA "use client" YO'Q
import { cookies } from "next/headers";
import DashboardHeader from "./_components/DashboardHeader";
import { AuthProvider } from "@/components/providers/AuthProvider";
import AuthGate from "@/components/providers/AuthGate";
import ScrollRestorationReset from "@/components/shared/ScrollRestorationReset";
import PermissionGate from "@/components/providers/PermissionGate";

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
