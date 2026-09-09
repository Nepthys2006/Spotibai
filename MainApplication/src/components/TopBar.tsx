import { Link } from "react-router-dom";
import { Icon } from "./icons.tsx";
import { sanitizeText, useProfile, useSession } from "../hooks/useSession.ts";

export function TopBar() {
  const { user } = useSession();
  const { profile } = useProfile();
  const displayName = sanitizeText(
    profile?.display_name ?? user?.email ?? "",
  );
  const initial = (displayName.trim().slice(0, 1) || "?").toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-accent/20 bg-gradient-to-r from-accent/[0.14] via-base/95 to-base/95 px-4 py-3 backdrop-blur sm:gap-3 sm:px-6">
      <Link
        to="/"
        aria-label="Spotibai home"
        className="flex min-h-11 min-w-0 shrink-0 items-center gap-2"
      >
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-black"
        >
          <Icon name="music" size={18} />
        </span>
        <span className="truncate text-base font-bold tracking-tight text-neutral-100">
          Spotibai
        </span>
      </Link>
      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        {user ? (
          <Link
            to="/profile"
            aria-label="Open profile"
            className="flex min-h-11 min-w-0 max-w-36 items-center gap-2 rounded-full border border-line bg-elevated py-1.5 pl-1.5 pr-3 transition-colors hover:border-neutral-500 sm:max-w-56"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-black"
            >
              {initial}
            </span>
            <span className="truncate text-sm font-medium text-neutral-100">
              {displayName}
            </span>
          </Link>
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
