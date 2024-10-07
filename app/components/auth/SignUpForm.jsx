"use client";

import { useState } from "react";
import { Button, TextField } from "@mui/material";
import Link from "next/link";
import Input from "../../components/Input";

const SignUpForm = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [IDNumber, setIDNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSignup = (e) => {
    e.preventDefault();
  };

  return (
    <div>
      <h1 className="h3 text-[2rem]">Get Started,</h1>
      <small className="text-gray-500">
        Please enter your details to receive an OTP.
      </small>
      <form className="mt-5" onSubmit={handleSignup}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input
            type="text"
            id="first-name"
            name="first-name"
            label="First Name"
            value={firstName}
            setValue={setFirstName}
          />
          <Input
            type="text"
            id="last-name"
            name="last-name"
            label="Last Name"
            value={lastName}
            setValue={setLastName}
          />
        </div>
        <Input
          type="text"
          label="Address"
          id="address"
          name="address"
          value={address}
          setValue={setAddress}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input
            type="text"
            label="Country"
            id="country"
            name="country"
            value={country}
            setValue={setCountry}
          />
          <Input
            type="text"
            label="Postal Code"
            id="postalCode"
            name="postalCode"
            value={postalCode}
            setValue={setPostalCode}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input
            type="date"
            label="Date of Birth"
            id="birth-date"
            name="birth-date"
            value={birthDate}
            setValue={setBirthDate}
          />
          <Input
            type="text"
            label="ID Number"
            id="id"
            name="id"
            value={IDNumber}
            setValue={setIDNumber}
          />
        </div>
        <Input
          type="password"
          label="Password"
          id="password"
          name="password"
          value={password}
          setValue={setPassword}
        />
        <Input
          type="password"
          label="Confirm Password"
          id="confirm-password"
          name="confirm-password"
          value={confirmPassword}
          setValue={setConfirmPassword}
        />
        <Button
          type="submit"
          variant="contained"
          className="hover:bg-primary mt-5 bg-primary text-white w-full"
        >
          SignUp
        </Button>
      </form>

      <div className="place-middle mt-[2rem]">
        <span>Already have an account?</span>

        <Link href="/auth/login">
          <Button variant="text" type="submit" className="text-primary">
            Login
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default SignUpForm;
