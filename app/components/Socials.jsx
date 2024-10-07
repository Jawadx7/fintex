import { Facebook, Instagram, Twitter } from "lucide-react";
import Link from "next/link";

const Socials = () => {
  const socials = [
    {
      name: "Facebook",
      path: "https://facebook.com",
      icon: <Facebook />,
    },
    {
      name: "Twitter",
      path: "https://twitter.com",
      icon: <Twitter />,
    },
    {
      name: "Instagram",
      path: "https://instagram.com",
      icon: <Instagram />,
    },
  ];
  return (
    <ul className="flex align-center space-x-3 my-3">
      {socials.map((item) => (
        <li key={item.name}>
          <Link href={item.path}>{item.icon}</Link>
        </li>
      ))}
    </ul>
  );
};
export default Socials;
