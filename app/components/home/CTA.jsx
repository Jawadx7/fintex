import { Button } from "@mui/material";
import Link from "next/link";

const CTA = () => {
  return (
    <div className="bg-primary text-white px-5 py-20 rounded-[1.5rem] m-2 flex align-center justify-center flex-col">
      <h1 className="text-center text-5xl font-[500]">Open an account in</h1>
      <h1 className="text-center text-5xl font-[500] text-primary_light">
        5 Minutes
      </h1>
      <p className="my-5 w-full md:w-1/2 text-center">
        Experience hassle-free onboarding with our streamlined account setup
        process. In just five minutes, you can complete your registration and
        gain instant access to our suite of financial tools. Join us today and
        take the first step towards smarter financial management.
      </p>

      <Link href="/auth">
        <Button
          variant="contained"
          className="btn_primary rounded-[2rem] bg-white text-primary hover:text-primary hover:bg-white"
        >
          Get Started
        </Button>
      </Link>
    </div>
  );
};
export default CTA;
