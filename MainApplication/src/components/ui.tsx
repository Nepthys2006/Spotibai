import type { ReactNode } from "react";

export function Button({
  children,
  variant = "primary",
  type = "button",
  disabled,
  onClick,
  className,
}: {
  children: ReactNode;
  variant?: "primary" | "ghost" | "subtle" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const styles =
    variant === "primary"
      ? "bg-accent text-black font-semibold hover:bg-accent-strong"
      : variant === "danger"
        ? "bg-red-500/15 text-red-300 border border-red-500/40 hover:bg-red-500/25"
        : variant === "ghost"
          ? "text-neutral-200 border border-line hover:border-neutral-500"
          : "bg-elevated text-neutral-100 hover:bg-line";
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full px-5 py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-neutral-200">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`min-h-11 w-full rounded-lg border border-line bg-elevated px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 hover:border-neutral-500 ${props.className ?? ""}`}
    />
  );
}

export function Card({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-line bg-card p-4 transition-colors hover:bg-elevated">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-sm font-semibold text-neutral-100">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 break-words text-xs text-muted">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </article>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center">
      <p className="text-base font-semibold text-neutral-100">{title}</p>
      <p className="max-w-md text-sm text-muted">{body}</p>
      {action ? (
        <div className="mt-3 flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
          {action}
        </div>
      ) : null}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-bold text-neutral-100">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-100">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

export function CoverThumb({ label }: { label: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-elevated text-sm font-bold text-muted"
    >
      {label.slice(0, 1).toUpperCase()}
    </div>
  );
}
