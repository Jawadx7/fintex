"use client";
import { Button } from "@mui/material";

const PrimaryButton = ({ text }) => {
  return (
    <Button
      variant="contained"
      className="hover:bg-primary w-fit bg-primary text-primary_variant"
    >
      {text}
    </Button>
  );
};

export default PrimaryButton;
