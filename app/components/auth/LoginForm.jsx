"use client";
import { useState } from "react";
import { Button, TextField } from "@mui/material";
import Link from "next/link";
import Input from "../../components/Input";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
  };

  return (
    <div>
      <h1 className="h3 text-[2rem]">Welcome Back,</h1>
      <small className="text-gray-500">Please enter your details ...</small>
      <form className="mt-5" onSubmit={handleLogin}>
        <Input
          type="email"
          id="email"
          name="email"
          label="Email"
          value={email}
          setValue={setEmail}
        />
        <Input
          type="password"
          id="password"
          name="password"
          label="Password"
          value={password}
          setValue={setPassword}
        />
        <Button
          type="submit"
          variant="contained"
          className="hover:bg-primary mt-5 bg-primary text-white w-full"
        >
          LogIn
        </Button>
      </form>

      <div className="place-middle mt-[2rem]">
        <span>Don&apos;t have an account?</span>
        <Link href="/auth/signup">
          <Button variant="text" type="submit" className="text-primary">
            Sign Up
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default LoginForm;
