import { Button } from "@mui/material";

const CTA = () => {
  return (
    <div className="bg-primary text-white px-5 py-20 rounded-[1.5rem] m-2 flex align-center justify-center flex-col">
      <h1 className="text-5xl font-[200]">Open an account in</h1>
      <h1 className="text-5xl font-[200] text-primary_light">5 Minutes</h1>
      <p className="my-5 w-full md:w-1/2 text-center">
        Lorem ipsum dolor, sit amet consectetur adipisicing elit. Vero vitae
        nulla sunt reiciendis laboriosam dolores sapiente eos? In, veniam
        excepturi.
      </p>

      <Button
        variant="contained"
        className="btn_primary rounded-[2rem] bg-white text-primary hover:text-primary hover:bg-white"
      >
        Get Started
      </Button>
    </div>
  );
};
export default CTA;
