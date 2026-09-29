"use client";

import { AuthenticatedShell } from "@/features/auth/authenticated-shell";
import { useAuth } from "@/features/auth/auth-provider";
import { AdminDashboard } from "@/features/admin-dashboard";
import { ResidentDashboard } from "@/features/resident-dashboard";

export default function BillingHome() {
  const { user } = useAuth();
  return (
    <AuthenticatedShell>
      {user?.roles.includes("ADMINISTRACION") ? (
        <AdminDashboard />
      ) : user?.roles.includes("RESIDENTE") &&
        user.apartment?.tipoResidente === "PROPIETARIO" ? (
        <ResidentDashboard />
      ) : (
        <main>
          <div className="error">
            Este módulo está disponible para administración y propietarios.
          </div>
        </main>
      )}
    </AuthenticatedShell>
  );
}
