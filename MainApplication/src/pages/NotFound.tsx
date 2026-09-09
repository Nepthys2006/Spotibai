import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <section
      aria-labelledby="notfound-title"
      className="mx-auto flex max-w-md flex-col items-center gap-2 py-16 text-center"
    >
      <p className="text-5xl font-bold text-neutral-100">404</p>
      <h1 id="notfound-title" className="text-xl font-semibold">
        This page skipped town
      </h1>
      <p className="text-sm leading-relaxed text-muted">
        The link may be old or mistyped. Head home or search for what you
        wanted to hear.
      </p>
      <div className="mt-4 flex gap-2">
        <Link
          to="/"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black hover:bg-accent-strong"
        >
          Go home
        </Link>
        <Link
          to="/search"
          className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-neutral-200 hover:border-neutral-500"
        >
          Search
        </Link>
      </div>
    </section>
  );
}
