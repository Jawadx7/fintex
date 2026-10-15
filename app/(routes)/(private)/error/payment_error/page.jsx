import ButtonLink from "../../../../components/ButtonLink";
import { getPostLoginPath } from "@/lib/auth/redirects";

const page = () => {
  return (
    <main className="p-5">
      <div>Payment Error</div>
      <ButtonLink path={getPostLoginPath()} text="Go to Account" />
    </main>
  );
};
export default page;
