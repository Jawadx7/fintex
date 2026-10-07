"use client";
import { Button } from "@/app/components/ui/button";

const PrimaryButton = ({ text, ...props }) => {
  return (
    <Button
      className="w-fit bg-primary text-primary-foreground hover:bg-primary/90"
      {...props}
    >
      {text}
    </Button>
  );
};

export default PrimaryButton;