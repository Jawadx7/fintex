"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/app/components/ui/button";

const ButtonLink = (props) => {
  return (
    <Link href={props.path}>
      <Button className="btn_primary bg-primary text-primary-foreground hover:bg-primary/90">
        {props.text} <ArrowRight />
      </Button>
    </Link>
  );
};

export default ButtonLink;