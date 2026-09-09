import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button, Field, TextInput } from "../../components/ui.tsx";
import { supabase } from "../../lib/supabase.ts";

/** Validation schema kept for the auth-wiring pass — no submit logic yet. */
export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export function Login() {
  const navigate = useNavigate();
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const data = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({
      email: String(data.get("email") ?? "").trim(),
      password: String(data.get("password") ?? ""),
    });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        email: flat.email?.[0],
        password: flat.password?.[0],
      });
      return;
    }
    setFieldErrors({});
    setPending(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setPending(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    navigate("/");
  };

  return (
    <section aria-labelledby="login-title" className="mx-auto max-w-md py-6">
      <h1 id="login-title" className="text-2xl font-bold">
        Welcome back
      </h1>
      <p className="mt-1 text-sm text-muted">
        Log in to pick up your music where you left off.
      </p>
      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
        <Field label="Email" htmlFor="login-email" error={fieldErrors.email}>
          <TextInput
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </Field>
        <Field label="Password" htmlFor="login-password" error={fieldErrors.password}>
          <TextInput
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            required
          />
        </Field>
        {formError ? (
          <p role="alert" className="text-xs text-red-300">
            {formError}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Logging in…" : "Log in"}
        </Button>
        <p className="text-xs leading-relaxed text-muted">
          Session handling lands in the auth pass. Nothing is sent anywhere
          from this form yet.
        </p>
      </form>
      <p className="mt-5 flex flex-col gap-1 text-sm text-muted">
        <Link to="/reset" className="font-medium text-neutral-100 underline">
          Forgot your password?
        </Link>
        <span>
          New here?{" "}
          <Link to="/signup" className="font-medium text-neutral-100 underline">
            Create an account
          </Link>
        </span>
      </p>
    </section>
  );
}
