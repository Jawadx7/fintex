import ApplicationShell from "../../../../components/private/ApplicationShell";

const ApplicationPage = async ({ params }) => {
  const { app_page } = await params;

  return <ApplicationShell appPage={app_page} />;
};

export default ApplicationPage;