"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@mui/material";
import Link from "next/link";

import Input from "@/app/components/Input";
import { authenticateUser, type AuthActionState } from "@/app/actions/auth";

const initialState: AuthActionState = {};

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
    // Read the callbackUrl from the URL rather than useSearchParams(), which
    // would force this statically-prerendered page into a Suspense boundary.
    const callbackUrl = new URLSearchParams(window.location.search).get(
      "callbackUrl"
    );
    router.push(callbackUrl ?? "/application/dashboard");
    router.refresh();
  }, [state.success, router]);

  const fieldErrors = state.fieldErrors ?? {};

  return (
    <div>
      <h1 className="h3 text-[2rem]">Welcome Back,</h1>
      <small className="text-gray-500">Please enter your details ...</small>

      <form className="mt-5" action={formAction} noValidate>
        <Input
          type="email"
          id="email"
          name="email"
          label="Email"
          value={email}
          setValue={setEmail}
          error={fieldErrors.email}
          required
          autoComplete="email"
        />
        <Input
          type="password"
          id="password"
          name="password"
          label="Password"
          value={password}
          setValue={setPassword}
          error={fieldErrors.password}
          required
          autoComplete="current-password"
        />

        {state.formError && (
          <p role="alert" className="text-[12px] text-red-500 mt-2">
            {state.formError}
          </p>
        )}

        <Button
          type="submit"
          variant="contained"
          disabled={isPending}
          className="hover:bg-primary mt-5 bg-primary text-white w-full"
        >
          {isPending ? "Logging in..." : "LogIn"}
        </Button>
      </form>

      <div className="place-middle mt-[2rem]">
        <span>Don&apos;t have an account?</span>
        <Link href="/auth/signup" className="text-primary">
          Sign Up
        </Link>
      </div>
    </div>
  );
};

export default LoginForm;
