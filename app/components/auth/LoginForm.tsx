"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { authenticateUser, type AuthActionState } from "@/app/actions/auth";

const initialState: AuthActionState = {};

// Demo helper is opt-in at build time; without the flag (and both values) no
// credentials are ever shipped to the browser.
const showDemoLogin = process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN === "true";
const demoAdminEmail = process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL ?? "";
const demoAdminPassword = process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD ?? "";
const canShowDemo = showDemoLogin && Boolean(demoAdminEmail && demoAdminPassword);

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, formAction, isPending] = useActionState(
    authenticateUser,
    initialState
  );
  const router = useRouter();

  useEffect(() => {
    if (!state.success) return;
    // Delegate to /auth/continue, which knows the signed-in user's role and
    // validates the callbackUrl, so role-based landing lives on the server.
    const callbackUrl = new URLSearchParams(window.location.search).get(
      "callbackUrl"
    );
    const params = new URLSearchParams();
    if (callbackUrl) params.set("callbackUrl", callbackUrl);
    const query = params.toString();
    router.push(`/auth/continue${query ? `?${query}` : ""}`);
    router.refresh();
  }, [state.success, router]);

  const fieldErrors = state.fieldErrors ?? {};

  return (
    <div>
      <form className="grid gap-4" action={formAction} noValidate>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            required
          />
          {fieldErrors.email && (
            <p id="email-error" className="text-xs text-destructive">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password ? "password-error" : undefined
            }
            required
          />
          {fieldErrors.password && (
            <p id="password-error" className="text-xs text-destructive">
              {fieldErrors.password}
            </p>
          )}
        </div>

        {state.formError && (
          <p role="alert" className="text-xs text-destructive">
            {state.formError}
          </p>
        )}

        <Button type="submit" disabled={isPending} className="mt-2 w-full">
          {isPending ? "Logging in..." : "Log in"}
        </Button>
      </form>

      {canShowDemo && (
        <div className="mt-4 rounded-md border border-dashed p-3">
          <p className="text-xs text-muted-foreground">
            Demo environment
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            onClick={() => {
              setEmail(demoAdminEmail);
              setPassword(demoAdminPassword);
            }}
          >
            Fill demo admin credentials
          </Button>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/auth/signup" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
};

export default LoginForm;