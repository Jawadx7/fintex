import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const ApplicationPage = () => {
  redirect("/application/dashboard");
};

export default ApplicationPage;
