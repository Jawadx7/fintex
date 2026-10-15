import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { logOutUser } from "@/app/actions/auth";
import { Button } from "@/app/components/ui/button";
import { auth } from "@/auth";
import logo from "@/public/images/logo.ico";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const firstName = session.user.name?.trim().split(" ")[0] || "there";

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold text-primary"
        >
          <Image src={logo} alt="Fintex logo" width={30} height={30} />
          <span>Fintex</span>
        </Link>

        <form action={logOutUser}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </header>

      <main className="mx-auto w-full max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold text-foreground">
          Welcome back, {firstName}
        </h1>
        <p className="mt-4 text-muted-foreground">
          Your transaction dashboard is being rebuilt and will arrive in a later
          release.
        </p>
      </main>
    </div>
  );
}
