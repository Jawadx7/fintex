import AuthShell from "../../../../components/auth/AuthShell";
import LoginForm from "../../../../components/auth/LoginForm";

const LogIn = () => {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Log in to Fintex"
      description="Enter your details to pick up where you left off."
    >
      <LoginForm />
    </AuthShell>
  );
};
export default LogIn;