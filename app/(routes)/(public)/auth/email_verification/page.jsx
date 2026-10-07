import AuthShell from "../../../../components/auth/AuthShell";
import EmailVerification from "../../../../components/auth/EmailVerification";

const VerifyEmail = () => {
  return (
    <AuthShell
      eyebrow="Almost there"
      title="Verify your email"
      description="Confirm your email address to secure your Fintex account."
    >
      <EmailVerification />
    </AuthShell>
  );
};
export default VerifyEmail;