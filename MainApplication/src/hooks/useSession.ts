import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { useAuth } from "../lib/AuthProvider.tsx";
import { supabase } from "../lib/supabase.ts";

/** Sanitize any user-rendered text before display. */
export function sanitizeText(value: string | null | undefined): string {
  return DOMPurify.sanitize(value ?? "");
}

interface ProfileRow {
  id: string;
  display_name: string | null;
  role: string | null;
}

async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,display_name,role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  // Empty table / missing row: render existing empty states, no throw.
  if (!data) return null;
  return data as ProfileRow;
}

/** Session passthrough (backed by AuthProvider bootstrap). */
export function useSession() {
  const { session, user, loading } = useAuth();
  return { session, user, loading };
}

/** Profile row for the session user; null when signed out or row missing. */
export function useProfile() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["profile", user?.id ?? "anon"],
    queryFn: () => fetchProfile(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
    retry: 1,
  });
  return {
    ...query,
    profile: query.data ?? null,
  };
}

/** Role for the session user, always read from the profiles row. */
export function useRole() {
  const { user, loading: sessionLoading } = useAuth();
  const { profile, isLoading: profileLoading, error } = useProfile();
  const role = profile?.role ?? null;
  return {
    role,
    isAdmin: role === "admin",
    isLoading: sessionLoading || profileLoading,
    error: error ?? null,
    user,
  };
}
