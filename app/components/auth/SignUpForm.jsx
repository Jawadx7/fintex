"use client";

import { useState } from "react";
import { Button, TextField } from "@mui/material";

const SignUpForm = ({ setCurrentPage }) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSignup = (e) => {
    e.preventDefault();
    setCurrentPage("emailverification");
  };

  return (
    <>
      <h1 className="h3 text-[2rem]">Get Started,</h1>
      <p>Enter your details to receive a OTP.</p>
      <form className="mt-[3rem]">
        <TextField
          type="text"
          label="Username"
          variant="outlined"
          fullWidth
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-[2rem]"
        />
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
        <TextField
          type="password"
          label="Confirm Password"
          variant="outlined"
          fullWidth
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mb-[2rem]"
        />
        <Button
          type="submit"
          variant="contained"
          className="btn_primary bg-primary text-white w-full"
          onClick={handleSignup}
        >
          SignUp
        </Button>
      </form>

      <div className="place-middle mt-[2rem]">
        <span>Already have an account?</span>
        <Button
          variant="text"
          type="submit"
          className="text-primary"
          onClick={() => setCurrentPage("login")}
        >
          Login
        </Button>
      </div>
    </>
  );
};

export default SignUpForm;
