"use client";

import { useState, type FormEvent } from "react";

import { AuthShell } from "@/components/shell/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

/**
 * Admin login form. Uses Better Auth's `signIn.email()` to authenticate
 * against the standard `/api/auth/sign-in/email` endpoint. On success,
 * redirects to the admin dashboard. Admin role is checked server-side
 * by `requireAdminUser()` in the layout.
 */
export function AdminLoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result?.error) {
        setError(result.error.message ?? "Invalid credentials.");
      } else {
        window.location.assign("/");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      description="Sign in to the internal operations console."
      layout="centered"
      title="Admin sign in"
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            autoComplete="email"
            id="email"
            name="email"
            placeholder="admin@requo.app"
            required
            type="email"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            autoComplete="current-password"
            id="password"
            name="password"
            required
            type="password"
          />
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button className="w-full" disabled={loading} type="submit">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
