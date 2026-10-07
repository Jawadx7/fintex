import AuthShell from "../../../../components/auth/AuthShell";
import SignUpForm from "../../../../components/auth/SignUpForm";

const SignUp = () => {
  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your Fintex account"
      description="Two quick steps and you're banking with Fintex."
    >
      <SignUpForm />
    </AuthShell>
  );
};
export default SignUp;