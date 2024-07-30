"use client";
import { Button } from "@mui/material";
import { useRouter } from "next/navigation";

const EmailVerification = () => {
  const router = useRouter();
  const handleEmailCheck = (e) => {
    e.preventDefault();
    console.log("User Authentication Attempted");
    router.push("/dashboard");
  };

  return (
    <>
      <h1 className="h2 text-[3rem]">Email Verification</h1>
      <form>
        <Button
          type="submit"
          variant="contained"
          className="btn_primary bg-primary text-white w-full"
          onClick={handleEmailCheck}
        >
          Submit
        </Button>
      </form>
    </>
  );
};

export default EmailVerification;
