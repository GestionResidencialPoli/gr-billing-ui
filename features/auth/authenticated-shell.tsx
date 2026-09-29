"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { EmptyState, Feedback, PlatformShell, Skeleton } from "@gestionresidencial/shared-ui";
import { authUiLoginUrl, openPlatformUrl, type Role } from "@gestionresidencial/auth-client";
import { useAuth } from "./auth-provider";

export function AuthenticatedShell({
  children,
  requiredRole,
}: {
  children: ReactNode;
  requiredRole?: Role;
}) {
  const { user, loading, sessionError, logout } = useAuth();
  const [pending, setPending] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !sessionError && !user) window.location.replace(authUiLoginUrl());
  }, [loading, sessionError, user]);

  async function signOut() {
    setPending(true);
    setLogoutError(false);
    try {
      await logout();
      window.location.replace(authUiLoginUrl());
    } catch {
      setLogoutError(true);
    } finally {
      setPending(false);
    }
  }

  if (loading || (!sessionError && !user)) {
    return (
      <div className="standalone-state">
        <Skeleton label="Cargando finanzas" />
      </div>
    );
  }

  if (sessionError || !user) {
    return (
      <div className="standalone-state">
        <EmptyState
          title="No pudimos verificar tu sesión"
          description="Comprueba que el servicio de usuarios esté disponible e inténtalo de nuevo."
        />
      </div>
    );
  }

  const hasAccess = !requiredRole || user.roles.includes(requiredRole);

  return (
    <PlatformShell
      app="billing"
      pathname={pathname}
      user={user}
      onOpenApp={(url) => void openPlatformUrl(user.roles, url)}
      onLogout={signOut}
      loggingOut={pending}
    >
      {logoutError && <Feedback error>No se pudo cerrar sesión. Inténtalo de nuevo.</Feedback>}
      {hasAccess ? (
        children
      ) : (
        <EmptyState
          title="No tienes acceso a esta sección"
          description="No tienes permisos para consultar este módulo."
        />
      )}
    </PlatformShell>
  );
}
