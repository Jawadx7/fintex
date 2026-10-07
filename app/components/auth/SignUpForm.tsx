"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Progress } from "@/app/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  registerUser,
  updateProfile,
  type AuthActionState,
} from "@/app/actions/auth";
import type { FieldErrors } from "@/lib/validation";

const initialState: AuthActionState = {};

const STEPS = [
  { id: 1, label: "Account" },
  { id: 2, label: "Personal info" },
];

function Field({
  id,
  name,
  label,
  type = "text",
  value,
  onChange,
  error,
  autoComplete,
  placeholder,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  const errorId = `${id}-error`;

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="mb-8 grid gap-3">
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-primary">
          Step {step} of 2 &middot; {STEPS[step - 1].label}
        </span>
        <span className="text-muted-foreground">{step * 50}%</span>
      </div>
      <Progress value={step * 50} aria-label={`Signup step ${step} of 2`} />
      <ol className="flex items-center gap-2 text-xs text-muted-foreground">
        {STEPS.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex items-center gap-1.5",
              item.id === step && "text-primary",
              item.id < step && "text-primary/70"
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
                item.id < step && "border-primary bg-primary text-white",
                item.id === step && "border-primary text-primary"
              )}
            >
              {item.id < step ? <Check className="h-3 w-3" /> : item.id}
            </span>
            {item.label}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ErrorSummary({
  errors,
  formError,
}: {
  errors: FieldErrors;
  formError?: string;
}) {
  const messages = Object.values(errors).filter(Boolean);
  if (!formError && messages.length === 0) return null;

  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
    >
      {formError ?? messages[0]}
    </p>
  );
}

export default function SignUpForm() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [idNumber, setIdNumber] = useState("");

  const [accountState, accountAction, isCreatingAccount] = useActionState(
    registerUser,
    initialState
  );
  const [profileState, profileAction, isSavingProfile] = useActionState(
    updateProfile,
    initialState
  );

  // Step 1 succeeding is what advances the user to step 2, so the step is
  // derived from the action state instead of being mirrored into local state.
  // Step 2 succeeding -> the profile is complete, so enter the app.
  useEffect(() => {
    if (!profileState.success) return;
    router.push("/application/dashboard");
    router.refresh();
  }, [profileState.success, router]);

  const step: 1 | 2 = accountState.success ? 2 : 1;

  const isPending = isCreatingAccount || isSavingProfile;
  const state = step === 1 ? accountState : profileState;
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <div>
      <StepIndicator step={step} />

      {step === 1 ? (
        <form className="grid gap-4" action={accountAction} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="firstName"
              name="firstName"
              label="First name"
              value={firstName}
              onChange={setFirstName}
              error={fieldErrors.firstName}
              autoComplete="given-name"
            />
            <Field
              id="lastName"
              name="lastName"
              label="Last name"
              value={lastName}
              onChange={setLastName}
              error={fieldErrors.lastName}
              autoComplete="family-name"
            />
          </div>

          <Field
            id="email"
            name="email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            error={fieldErrors.email}
            autoComplete="email"
            placeholder="you@example.com"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="password"
              name="password"
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              error={fieldErrors.password}
              autoComplete="new-password"
            />
            <Field
              id="confirmPassword"
              name="confirmPassword"
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              error={fieldErrors.confirmPassword}
              autoComplete="new-password"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Use at least 8 characters. Your account is created on this step, so
            you can sign in right away.
          </p>

          <ErrorSummary errors={fieldErrors} formError={state.formError} />

          <Button type="submit" disabled={isPending} className="w-full">
            {isCreatingAccount ? "Creating account..." : "Create account"}
          </Button>
        </form>
      ) : (
        <form className="grid gap-4" action={profileAction} noValidate>
          <p className="rounded-md border border-primary/30 bg-primary/10 p-3 text-xs text-primary">
            Your account is ready and you&apos;re signed in. Add a few details to
            finish setting up your profile.
          </p>

          <Field
            id="address"
            name="address"
            label="Street address"
            value={address}
            onChange={setAddress}
            error={fieldErrors.address}
            autoComplete="street-address"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="country"
              name="country"
              label="Country"
              value={country}
              onChange={setCountry}
              error={fieldErrors.country}
              autoComplete="country-name"
            />
            <Field
              id="postalCode"
              name="postalCode"
              label="Postal code"
              value={postalCode}
              onChange={setPostalCode}
              error={fieldErrors.postalCode}
              autoComplete="postal-code"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="birthDate"
              name="birthDate"
              label="Date of birth"
              type="date"
              value={birthDate}
              onChange={setBirthDate}
              error={fieldErrors.birthDate}
              autoComplete="bday"
            />
            <Field
              id="idNumber"
              name="idNumber"
              label="ID number"
              value={idNumber}
              onChange={setIdNumber}
              error={fieldErrors.idNumber}
            />
          </div>

          <ErrorSummary errors={fieldErrors} formError={state.formError} />

          {/* No "back" control here: the account already exists by now, so
              re-submitting step 1 would only return "email already in use". */}
          <Button type="submit" disabled={isPending} className="w-full">
            {isSavingProfile ? "Saving..." : "Finish setup"}
          </Button>
        </form>
      )}

      {step === 1 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </p>
      )}
    </div>
  );
}