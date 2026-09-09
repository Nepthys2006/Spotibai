import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button, Field, TextInput } from "../components/ui.tsx";
import { sanitizeText, useProfile, useRole, useSession } from "../hooks/useSession.ts";
import { supabase } from "../lib/supabase.ts";

const nameSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Enter a display name")
    .max(60, "Keep it under 60 characters"),
});

const passwordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    confirm: z.string().min(8, "Use at least 8 characters"),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { profile } = useProfile();
  const { isAdmin } = useRole();

  const displayName = sanitizeText(
    profile?.display_name ?? user?.email ?? "",
  );
  const initial = (displayName.trim().slice(0, 1) || "?").toUpperCase();

  const [nameError, setNameError] = useState<string | undefined>();
  const [nameNotice, setNameNotice] = useState<string | null>(null);
  const [namePending, setNamePending] = useState(false);

  const [pwErrors, setPwErrors] = useState<Record<string, string | undefined>>({});
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwNotice, setPwNotice] = useState<string | null>(null);
  const [pwPending, setPwPending] = useState(false);

  const [confirmInput, setConfirmInput] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const [logoutPending, setLogoutPending] = useState(false);

  if (!user) return null;

  const handleNameSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNameNotice(null);
    const data = new FormData(e.currentTarget);
    const parsed = nameSchema.safeParse({
      displayName: String(data.get("displayName") ?? ""),
    });
    if (!parsed.success) {
      setNameError(
        parsed.error.flatten().fieldErrors.displayName?.[0] ??
          "Enter a display name",
      );
      return;
    }
    setNameError(undefined);
    setNamePending(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: parsed.data.displayName })
      .eq("id", user.id);
    setNamePending(false);
    if (error) {
      setNameError(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    setNameNotice("Profile updated.");
  };

  const handlePasswordSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPwError(null);
    setPwNotice(null);
    const data = new FormData(e.currentTarget);
    const parsed = passwordSchema.safeParse({
      password: String(data.get("password") ?? ""),
      confirm: String(data.get("confirm") ?? ""),
    });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setPwErrors({ password: flat.password?.[0], confirm: flat.confirm?.[0] });
      return;
    }
    setPwErrors({});
    setPwPending(true);
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    setPwPending(false);
    if (error) {
      setPwError(error.message);
      return;
    }
    e.currentTarget.reset();
    setPwNotice("Password changed. Use it next time you log in.");
  };

  const confirmMatches =
    confirmInput.trim().toLowerCase() ===
    (user.email ?? "").trim().toLowerCase();

  const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!confirmMatches || deletePending) return;
    setDeleteError(null);
    setDeletePending(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { confirmEmail: confirmInput.trim() },
      });
      if (error) throw new Error(error.message);
      const body = data as { ok?: boolean; error?: string } | null;
      if (body && body.ok === false) {
        throw new Error(body.error ?? "Could not delete account.");
      }
      await supabase.auth.signOut();
      await queryClient.clear();
      navigate("/", { replace: true });
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Could not delete account.",
      );
    } finally {
      setDeletePending(false);
    }
  };

  const handleLogout = async () => {
    setLogoutPending(true);
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex min-w-0 items-center gap-4">
        <div
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent text-xl font-bold text-black"
        >
          {initial}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">Profile</h1>
          <p className="truncate text-sm text-muted">
            {displayName}
            {user.email && user.email !== profile?.display_name
              ? ` · ${user.email}`
              : ""}
          </p>
          {isAdmin ? (
            <Link
              to="/admin"
              className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-accent hover:underline sm:min-h-0"
            >
              Open admin dashboard
            </Link>
          ) : null}
        </div>
      </div>

      <section
        aria-labelledby="profile-info"
        className="rounded-2xl border border-line bg-surface p-4 sm:p-5"
      >
        <h2 id="profile-info" className="text-base font-bold">
          Profile info
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          This name shows in the header and on shared playlists.
        </p>
        <form
          aria-label="Edit profile info"
          onSubmit={handleNameSave}
          className="mt-4 flex flex-col gap-4"
        >
          <Field label="Display name" htmlFor="profile-name" error={nameError}>
            <TextInput
              key={profile?.display_name ?? "empty"}
              id="profile-name"
              name="displayName"
              defaultValue={profile?.display_name ?? ""}
              placeholder="What should we call you?"
              required
              minLength={1}
              maxLength={60}
              autoComplete="nickname"
            />
          </Field>
          {nameNotice ? (
            <p aria-live="polite" className="text-xs text-accent">
              {nameNotice}
            </p>
          ) : null}
          <div>
            <Button type="submit" disabled={namePending}>
              {namePending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </section>

      <section
        aria-labelledby="profile-password"
        className="rounded-2xl border border-line bg-surface p-4 sm:p-5"
      >
        <h2 id="profile-password" className="text-base font-bold">
          Change password
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          You stay logged in on this device after changing it.
        </p>
        <form
          aria-label="Change password"
          onSubmit={handlePasswordSave}
          className="mt-4 flex flex-col gap-4"
        >
          <Field
            label="New password"
            htmlFor="profile-password-new"
            error={pwErrors.password}
          >
            <TextInput
              id="profile-password-new"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              required
              minLength={8}
            />
          </Field>
          <Field
            label="Confirm new password"
            htmlFor="profile-password-confirm"
            error={pwErrors.confirm}
          >
            <TextInput
              id="profile-password-confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat the new password"
              required
              minLength={8}
            />
          </Field>
          {pwError ? (
            <p role="alert" className="text-xs text-red-300">
              {pwError}
            </p>
          ) : null}
          {pwNotice ? (
            <p aria-live="polite" className="text-xs text-accent">
              {pwNotice}
            </p>
          ) : null}
          <div>
            <Button type="submit" disabled={pwPending}>
              {pwPending ? "Saving…" : "Set new password"}
            </Button>
          </div>
        </form>
      </section>

      <section
        aria-labelledby="profile-session"
        className="rounded-2xl border border-line bg-surface p-4 sm:p-5"
      >
        <h2 id="profile-session" className="text-base font-bold">
          Session
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          Logged in as {user.email ?? "your account"}.
        </p>
        <div className="mt-4">
          <Button
            variant="ghost"
            onClick={handleLogout}
            disabled={logoutPending}
          >
            {logoutPending ? "Logging out…" : "Log out"}
          </Button>
        </div>
      </section>

      <section
        aria-labelledby="profile-danger"
        className="rounded-2xl border border-red-500/40 bg-surface p-4 sm:p-5"
      >
        <h2 id="profile-danger" className="text-base font-bold text-red-300">
          Danger zone
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          Deleting your account removes your profile, playlists, and likes
          right away. This cannot be undone.
        </p>
        <form
          aria-label="Delete account"
          onSubmit={handleDelete}
          className="mt-4 flex flex-col gap-4"
        >
          <Field
            label={`Type ${user.email ?? "your email"} to confirm`}
            htmlFor="profile-delete-confirm"
          >
            <TextInput
              id="profile-delete-confirm"
              name="confirm"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={user.email ?? "Your email"}
              autoComplete="off"
            />
          </Field>
          {deleteError ? (
            <p role="alert" className="text-xs text-red-300">
              {deleteError}
            </p>
          ) : null}
          <div>
            <Button
              type="submit"
              variant="danger"
              disabled={!confirmMatches || deletePending}
            >
              {deletePending ? "Deleting…" : "Delete my account"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
