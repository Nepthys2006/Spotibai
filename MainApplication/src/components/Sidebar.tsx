import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Home", end: true, icon: "⌂" },
  { to: "/search", label: "Search", end: false, icon: "⌕" },
  { to: "/library", label: "Library", end: false, icon: "▤" },
  { to: "/liked", label: "Liked Songs", end: false, icon: "♥" },
  { to: "/admin", label: "Admin", end: false, icon: "⚙" },
];

export function Sidebar() {
  return (
    <aside
      aria-label="Primary"
      className="hidden w-60 shrink-0 flex-col gap-1 border-r border-line bg-surface p-4 md:flex"
    >
      <p className="px-2 pb-3 text-base font-bold tracking-tight text-neutral-100">
        Spotibai
      </p>
      <nav className="flex flex-col gap-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-elevated text-neutral-100"
                  : "text-muted hover:bg-card hover:text-neutral-100"
              }`
            }
          >
            <span aria-hidden="true" className="w-5 text-center">
              {l.icon}
            </span>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto rounded-xl border border-line bg-card p-3 text-xs leading-relaxed text-muted">
        Your uploads stay private until you share a playlist. Audio wiring lands
        in Phase 4.
      </div>
    </aside>
  );
}

export function MobileNav() {
  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-0 bottom-[158px] z-30 border-t border-line bg-surface px-2 py-1 md:hidden"
    >
      <ul className="grid grid-cols-5 gap-1">
        {links.map((l) => (
          <li key={l.to}>
            <NavLink
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[11px] font-medium ${
                  isActive ? "text-accent" : "text-muted"
                }`
              }
            >
              <span aria-hidden="true" className="text-base leading-none">
                {l.icon}
              </span>
              {l.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
