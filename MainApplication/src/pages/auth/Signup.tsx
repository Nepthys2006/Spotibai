import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button, Field, TextInput } from "../../components/ui.tsx";
import { supabase } from "../../lib/supabase.ts";

/** Validation schema kept for the auth-wiring pass — no submit logic yet. */
export const signupSchema = z.object({
  displayName: z.string().trim().min(1, "Enter a display name").max(60),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

export function Signup() {
  const navigate = useNavigate();
  const [fieldErrors, setFieldErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    const data = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      displayName: String(data.get("displayName") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      password: String(data.get("password") ?? ""),
    });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        displayName: flat.displayName?.[0],
        email: flat.email?.[0],
        password: flat.password?.[0],
      });
      return;
    }
    setFieldErrors({});
    setPending(true);
    const { data: result, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { display_name: parsed.data.displayName } },
    });
    setPending(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    // Profile row is created by the live handle_new_user trigger.
    if (result.session) {
      navigate("/");
    } else {
      setNotice("Check your email to confirm your account, then log in.");
    }
  };

  return (
    <section aria-labelledby="signup-title" className="mx-auto max-w-md py-6">
      <h1 id="signup-title" className="text-2xl font-bold">
        Create your account
      </h1>
      <p className="mt-1 text-sm text-muted">
        One account for your library, playlists, and liked songs.
      </p>
      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
        <Field label="Display name" htmlFor="signup-name" error={fieldErrors.displayName}>
          <TextInput
            id="signup-name"
            name="displayName"
            autoComplete="nickname"
            placeholder="What should we call you?"
            required
            minLength={1}
            maxLength={60}
          />
        </Field>
        <Field label="Email" htmlFor="signup-email" error={fieldErrors.email}>
          <TextInput
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </Field>
        <Field
          label="Password"
          hint="At least 8 characters."
          htmlFor="signup-password"
          error={fieldErrors.password}
        >
          <TextInput
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a password"
            required
            minLength={8}
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
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Signing up…" : "Sign up"}
        </Button>
        <p className="text-xs leading-relaxed text-muted">
          Submit wiring lands in the auth pass. Your profile is created
          automatically on first sign in.
        </p>
      </form>
      <p className="mt-5 text-sm text-muted">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-neutral-100 underline">
          Log in
        </Link>
      </p>
    </section>
  );
}
