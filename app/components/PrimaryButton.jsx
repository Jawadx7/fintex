"use client";
import { Button } from "@mui/material";

const PrimaryButton = ({ text }) => {
  return (
    <Button
      variant="contained"
      className="btn_primary bg-primary text-primary_variant"
    >
      {text}
    </Button>
  );
};

export default PrimaryButton;
