import { Link, useNavigate } from "react-router-dom";
import { sanitizeText, useProfile, useSession } from "../hooks/useSession.ts";
import { supabase } from "../lib/supabase.ts";

export function TopBar() {
  const navigate = useNavigate();
  const { user } = useSession();
  const { profile } = useProfile();
  const displayName = sanitizeText(
    profile?.display_name ?? user?.email ?? "",
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-base/95 px-4 py-3 backdrop-blur sm:gap-3 sm:px-6">
      <form
        role="search"
        aria-label="Catalog search"
        className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-md sm:flex-none sm:basis-80 sm:grow"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const q = String(data.get("q") ?? "").trim();
          navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
        }}
      >
        <label htmlFor="topbar-search" className="sr-only">
          Search songs, artists, albums
        </label>
        <input
          id="topbar-search"
          name="q"
          type="search"
          placeholder="Search songs, artists, albums"
          autoComplete="off"
          className="min-h-11 w-full min-w-0 rounded-full border border-line bg-elevated px-4 py-2 text-sm text-neutral-100 placeholder:truncate placeholder:text-neutral-500 hover:border-neutral-500"
        />
      </form>
      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        {user ? (
          <>
            <span
              className="hidden rounded-full border border-line px-3 py-1.5 text-xs text-muted sm:inline"
              aria-live="polite"
            >
              {displayName}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-muted hover:text-neutral-100 sm:px-4"
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <span
              className="hidden rounded-full border border-line px-3 py-1.5 text-xs text-muted sm:inline"
              aria-live="polite"
            >
              Signed out
            </span>
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-muted hover:text-neutral-100 sm:px-4"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full bg-accent px-3 py-2 text-sm font-semibold text-black hover:bg-accent-strong sm:px-4"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
