import type { ReactNode } from "react";
import { useRole, useSession } from "../hooks/useSession.ts";
import { NotFound } from "../pages/NotFound.tsx";

/**
 * Admin guard: always reads profiles.role for the session user.
 * Non-admin / unsigned callers see the existing NotFound pattern.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading: sessionLoading } = useSession();
  const { isAdmin, isLoading: roleLoading } = useRole();

  if (sessionLoading || roleLoading) return null;
  if (!user || !isAdmin) return <NotFound />;
  return <>{children}</>;
}
