import Image from "next/image";
import Link from "next/link";

import logo from "@/public/images/logo.ico";

type AuthShellProps = {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
};

export default function AuthShell({
  children,
  eyebrow,
  title,
  description,
}: AuthShellProps) {
  return (
    <main className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-2">
      {/* form pane */}
      <div className="flex w-full flex-col justify-center px-6 py-10 sm:px-10 lg:px-16">
        <Link
          href="/"
          className="mb-10 flex items-center gap-2 text-lg font-semibold text-primary"
        >
          <Image src={logo} alt="Fintex logo" width={30} height={30} />
          <span>Fintex</span>
        </Link>

        <div className="mx-auto w-full max-w-md">
          <p className="text-sm font-medium uppercase tracking-wider text-primary_fade">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">{title}</h1>
          <p className="mt-2 text-muted-foreground">{description}</p>

          <div className="mt-8">{children}</div>
        </div>
      </div>

      {/* cover pane: the split-image panel from the login-02 layout */}
      <div className="relative hidden overflow-hidden bg-primary lg:block">
        <Image
          src="/images/figure-1.png"
          alt=""
          fill
          priority
          className="object-cover opacity-45"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/80 to-primary_fade/70"
        />
        <div className="relative flex h-full flex-col justify-end p-10 text-primary-foreground xl:p-14">
          <blockquote className="max-w-md text-xl font-medium leading-relaxed xl:text-2xl">
            &ldquo;Banking that keeps pace with your ambition. Hold, transfer and
            track every dollar from a single workspace.&rdquo;
          </blockquote>
          <div className="mt-8 flex items-center gap-3">
            <span className="h-px w-10 bg-primary-foreground/50" />
            <span className="text-sm font-medium uppercase tracking-wider">
              Fintex
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}