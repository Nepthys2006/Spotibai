import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "../hooks/useSession.ts";

/**
 * Signed-in guard: mirrors RequireAdmin's loading pattern, but personal
 * pages send visitors to log in instead of showing NotFound.
 */
export function RequireUser({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
