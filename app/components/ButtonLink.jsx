import Link from "next/link";
import { Button } from "@mui/material";
import { ArrowRight } from "lucide-react";

const ButtonLink = (props) => {
  return (
    <Link
      href={props.path}
      // className="bg-blue-600 text-white py-2 px-4 rounded-sm w-fit"
    >
      <Button variant="contained">
        {props.text} <ArrowRight />
      </Button>
    </Link>
  );
};

export default ButtonLink;
