"use client";

import { useEffect, useState, type ReactNode } from "react";
import { authUiLoginUrl, type AppUser, type Role } from "@gestionresidencial/auth-client";
import { useAuth } from "./auth-provider";

function roleLabelFor(user: AppUser): string {
  if (user.roles.includes("ADMINISTRACION")) return "ADMINISTRACIÓN";
  if (user.apartment?.tipoResidente) return user.apartment.tipoResidente;
  if (user.roles.includes("RESIDENTE")) return "RESIDENTE";
  if (user.roles.includes("VIGILANTE")) return "VIGILANTE";
  return "USUARIO";
}

export function AuthenticatedShell({
  children,
  requiredRole,
}: {
  children: ReactNode;
  requiredRole?: Role;
}) {
  const { user, loading, sessionError, logout } = useAuth();
  const [logoutError, setLogoutError] = useState(false);

  useEffect(() => {
    if (!loading && !sessionError && !user)
      window.location.replace(authUiLoginUrl());
  }, [loading, sessionError, user]);

  async function signOut() {
    setLogoutError(false);
    try {
      await logout();
      window.location.replace(authUiLoginUrl());
    } catch {
      setLogoutError(true);
    }
  }

  if (loading || (!sessionError && !user)) {
    return (
      <main>
        <div className="empty">Comprobando tu sesión…</div>
      </main>
    );
  }

  if (sessionError) {
    return (
      <main>
        <div className="error">
          No pudimos verificar tu sesión. Comprueba que el gateway esté
          disponible e inténtalo de nuevo.
        </div>
      </main>
    );
  }

  const hasAccess = !requiredRole || user!.roles.includes(requiredRole);

  return (
    <>
      <header>
        <span className="brand">Gestión Residencial / Finanzas</span>
        <nav className="billing-nav" aria-label="Navegación financiera">
          <span className="role">
            {roleLabelFor(user!)}
          </span>
          <button type="button" onClick={signOut}>
            Cerrar sesión
          </button>
        </nav>
      </header>
      {logoutError && (
        <div className="error billing-error">
          No se pudo cerrar sesión. Inténtalo de nuevo.
        </div>
      )}
      {hasAccess ? (
        children
      ) : (
        <main>
          <div className="error">
            No tienes permisos para consultar este módulo.
          </div>
        </main>
      )}
    </>
  );
}
