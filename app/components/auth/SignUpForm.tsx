"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@mui/material";
import Link from "next/link";

import Input from "@/app/components/Input";
import { registerUser, type AuthActionState } from "@/app/actions/auth";

const initialState: AuthActionState = {};

const SignUpForm = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [state, formAction, isPending] = useActionState(
    registerUser,
    initialState
  );
  const router = useRouter();

  useEffect(() => {
    if (!state.success) return;
    router.push("/application/dashboard");
    router.refresh();
  }, [state.success, router]);

  const fieldErrors = state.fieldErrors ?? {};

  return (
    <div>
      <h1 className="h3 text-[2rem]">Get Started,</h1>
      <small className="text-gray-500">
        Please enter your details to create your account.
      </small>

      <form className="mt-5" action={formAction} noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input
            type="text"
            id="firstName"
            name="firstName"
            label="First Name"
            value={firstName}
            setValue={setFirstName}
            error={fieldErrors.firstName}
            required
            autoComplete="given-name"
          />
          <Input
            type="text"
            id="lastName"
            name="lastName"
            label="Last Name"
            value={lastName}
            setValue={setLastName}
            error={fieldErrors.lastName}
            required
            autoComplete="family-name"
          />
        </div>

        <Input
          type="text"
          id="address"
          name="address"
          label="Address"
          value={address}
          setValue={setAddress}
          error={fieldErrors.address}
          required
          autoComplete="street-address"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input
            type="text"
            id="country"
            name="country"
            label="Country"
            value={country}
            setValue={setCountry}
            error={fieldErrors.country}
            required
            autoComplete="country-name"
          />
          <Input
            type="text"
            id="postalCode"
            name="postalCode"
            label="Postal Code"
            value={postalCode}
            setValue={setPostalCode}
            error={fieldErrors.postalCode}
            required
            autoComplete="postal-code"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input
            type="date"
            id="birthDate"
            name="birthDate"
            label="Date of Birth"
            value={birthDate}
            setValue={setBirthDate}
            error={fieldErrors.birthDate}
            required
          />
          <Input
            type="text"
            id="idNumber"
            name="idNumber"
            label="ID Number"
            value={idNumber}
            setValue={setIdNumber}
            error={fieldErrors.idNumber}
            required
          />
        </div>

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
          autoComplete="new-password"
        />
        <Input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm Password"
          value={confirmPassword}
          setValue={setConfirmPassword}
          error={fieldErrors.confirmPassword}
          required
          autoComplete="new-password"
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
          {isPending ? "Creating account..." : "SignUp"}
        </Button>
      </form>

      <div className="place-middle mt-[2rem]">
        <span>Already have an account?</span>
        <Link href="/auth/login" className="text-primary">
          Login
        </Link>
      </div>
    </div>
  );
};

export default SignUpForm;
