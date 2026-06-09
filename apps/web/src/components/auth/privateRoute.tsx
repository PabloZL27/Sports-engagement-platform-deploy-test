import { useState } from "react";
import { WrapperProps } from "../../types/shared";
import { Auth } from "../../context/AuthContext";
import { ModalComp } from "../general/modal";
import { SigninWithEmailForm } from "./SignInForm";
import { SignupForm } from "./SignUpForm";

function PrivateRoute({ children }: WrapperProps) {
  const { session, loading } = Auth();
  const [isAuthOpen, setIsAuthOpen] = useState(true);
  const [authView, setAuthView] = useState<"signin" | "signup">("signin");

  if (loading) {
    return <p>Loading...</p>;
  }

  if (session) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="min-h-screen bg-[#F4F5F7]">
        <main className="page-main">
          <section className="mx-auto max-w-lg py-20 text-center">
            <h1 className="m-0 text-2xl font-bold text-[#0B2A55]">
              Sign in to continue
            </h1>
            <p className="mt-3 text-base text-[#516173]">
              You need an account to access this section.
            </p>
            <button
              type="button"
              className="mt-6 cursor-pointer rounded-xl bg-[#0f3d78] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#0B2A55]"
              onClick={() => setIsAuthOpen(true)}
            >
              Login / Sign Up
            </button>
          </section>
        </main>
      </div>

      <ModalComp
        isOpen={isAuthOpen}
        onOpenChange={setIsAuthOpen}
        children={
          authView === "signup" ? (
            <SignupForm
              onSuccess={() => setIsAuthOpen(false)}
              onSwitchToSignIn={() => setAuthView("signin")}
            />
          ) : (
            <SigninWithEmailForm
              onSuccess={() => setIsAuthOpen(false)}
              onSwitchToSignUp={() => setAuthView("signup")}
            />
          )
        }
      />
    </>
  );
}

export default PrivateRoute;
