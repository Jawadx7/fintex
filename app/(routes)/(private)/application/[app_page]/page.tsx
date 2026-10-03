import ApplicationShell from "@/app/components/private/ApplicationShell";
import { getFinanceData } from "@/lib/finance";
import { requireUser } from "@/lib/session";

const ApplicationPage = async ({
  params,
}: {
  params: Promise<{ app_page: string }>;
}) => {
  const { app_page } = await params;

  // requireUser() throws if the session is missing, so this never renders
  // another user's data.
  const user = await requireUser();
  const { accounts, transactions, summary } = await getFinanceData();

  return (
    <ApplicationShell
      appPage={app_page}
      accounts={accounts}
      transactions={transactions}
      summary={summary}
      userName={user.name ?? null}
    />
  );
};

export default ApplicationPage;
