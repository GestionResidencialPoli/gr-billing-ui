"use client";

import { EmptyState } from "@gestionresidencial/shared-ui";
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
        <EmptyState
          title="Este módulo no está disponible para tu cuenta"
          description="Las finanzas de la unidad están disponibles para administración y propietarios."
        />
      )}
    </AuthenticatedShell>
  );
}
