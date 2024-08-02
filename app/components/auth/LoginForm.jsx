"use client";
import { useState } from "react";
import { Button, TextField } from "@mui/material";
import PrimaryButton from "../PrimaryButton";

const LoginForm = ({ setCurrentPage }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    console.log(email, password);
    setCurrentPage("emailverification");
  };

  return (
    <div>
      <h1 className="h3 text-[2rem]">Welcome Back,</h1>
      <p>Enter your email and password to receive a OTP.</p>
      <form className="mt-[3rem]">
        <TextField
          type="email"
          label="Email"
          variant="outlined"
          fullWidth
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-[2rem]"
        />
        <TextField
          type="password"
          label="Password"
          variant="outlined"
          fullWidth
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-[2rem]"
        />
        <Button
          type="submit"
          variant="contained"
          className="btn_primary bg-primary text-white w-full"
          onClick={handleLogin}
        >
          LogIn
        </Button>
      </form>

      <div className="place-middle mt-[2rem]">
        <span>Don't have an account?</span>
        <Button
          variant="text"
          type="submit"
          className="text-primary"
          onClick={() => setCurrentPage("signup")}
        >
          Sign Up
        </Button>
      </div>
    </div>
  );
};

export default LoginForm;
