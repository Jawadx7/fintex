"use client";
import { useRouter } from "next/navigation";

import { Button } from "@/app/components/ui/button";

const EmailVerification = () => {
  const router = useRouter();
  const handleEmailCheck = (e) => {
    e.preventDefault();
    router.push("/application/dashboard");
  };

  return (
    <div>
      <h1 className="h2 text-[3rem]">Email Verification</h1>
      <form>
        <Button
          type="submit"
          className="btn_primary w-full bg-primary text-white hover:bg-primary/90"
          onClick={handleEmailCheck}
        >
          Submit
        </Button>
      </form>
    </div>
  );
};

export default EmailVerification;