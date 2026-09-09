import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button, Field, TextInput } from "../../components/ui.tsx";
import { useSession } from "../../hooks/useSession.ts";
import { supabase } from "../../lib/supabase.ts";

/** Validation schema kept for the auth-wiring pass — no submit logic yet. */
export const resetSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    confirm: z.string().min(8, "Use at least 8 characters"),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export function ResetPassword() {
  const navigate = useNavigate();
  // Recovery verify mode: Supabase restores a session from the email link.
  const { user } = useSession();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    const data = new FormData(e.currentTarget);
    const parsed = resetSchema.safeParse({
      email: String(data.get("email") ?? "").trim(),
    });
    if (!parsed.success) {
      setFieldErrors({ email: parsed.error.flatten().fieldErrors.email?.[0] });
      return;
    }
    setFieldErrors({});
    setPending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/reset`,
    });
    setPending(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setNotice("If an account exists for that email, a reset link is on its way.");
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    const data = new FormData(e.currentTarget);
    const parsed = updatePasswordSchema.safeParse({
      password: String(data.get("password") ?? ""),
      confirm: String(data.get("confirm") ?? ""),
    });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({ password: flat.password?.[0], confirm: flat.confirm?.[0] });
      return;
    }
    setFieldErrors({});
    setPending(true);
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    setPending(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    navigate("/login");
  };

  return (
    <section aria-labelledby="reset-title" className="mx-auto max-w-md py-6">
      <h1 id="reset-title" className="text-2xl font-bold">
        Reset your password
      </h1>
      <p className="mt-1 text-sm text-muted">
        Enter the email on your account and we will send a reset link.
      </p>
      {user ? (
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleUpdate}>
          <Field label="New password" htmlFor="reset-password" error={fieldErrors.password}>
            <TextInput
              id="reset-password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Choose a new password"
              required
              minLength={8}
            />
          </Field>
          <Field label="Confirm password" htmlFor="reset-confirm" error={fieldErrors.confirm}>
            <TextInput
              id="reset-confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat the new password"
              required
              minLength={8}
            />
          </Field>
          {formError ? (
            <p role="alert" className="text-xs text-red-300">
              {formError}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Set new password"}
          </Button>
        </form>
      ) : (
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleRequest}>
          <Field label="Email" htmlFor="reset-email" error={fieldErrors.email}>
            <TextInput
              id="reset-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </Field>
          {formError ? (
            <p role="alert" className="text-xs text-red-300">
              {formError}
            </p>
          ) : null}
          {notice ? (
            <p aria-live="polite" className="text-xs leading-relaxed text-muted">
              {notice}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send reset link"}
          </Button>
          <p className="text-xs leading-relaxed text-muted">
            Email delivery is wired in the auth pass. Check spam if a link does
            not arrive within a few minutes.
          </p>
        </form>
      )}
      <p className="mt-5 text-sm text-muted">
        Remembered it?{" "}
        <Link to="/login" className="font-medium text-neutral-100 underline">
          Back to log in
        </Link>
      </p>
    </section>
  );
}
