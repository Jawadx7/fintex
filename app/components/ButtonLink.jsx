"use client";
import Link from "next/link";
import { Button } from "@mui/material";
import { ArrowRight } from "lucide-react";

const ButtonLink = (props) => {
  return (
    <Link href={props.path}>
      <Button
        variant="contained"
        className="btn_primary bg-primary text-primary_variant"
      >
        {props.text} <ArrowRight />
      </Button>
    </Link>
  );
};

export default ButtonLink;
