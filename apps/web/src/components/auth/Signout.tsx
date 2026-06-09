import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "../../context/AuthContext";
import ConfirmDialog from "../admin/ConfirmDialog";

interface SignOutButtonProps {
  requireConfirmation?: boolean;
}

export const SignOutButton = ({ requireConfirmation = false }: SignOutButtonProps) => {
  const { SignOut } = Auth();
  const navigate = useNavigate();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  const performSignOut = async () => {
    try {
      setSignOutError("");
      setIsSigningOut(true);
      await SignOut();
      setIsConfirmOpen(false);
      navigate("/");
    } catch (err) {
      console.error(err);
      setSignOutError("Could not sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleClick = () => {
    if (requireConfirmation) {
      setSignOutError("");
      setIsConfirmOpen(true);
      return;
    }

    void performSignOut();
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="rounded-full bg-red-600 px-4 py-1.5 font-semibold text-white shadow-[0_10px_25px_rgba(255,0,0,0.35)] transition-all duration-200 hover:scale-105 hover:bg-red-700 active:scale-95"
      >
        Sign Out
      </button>

      {requireConfirmation && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          title="Sign out of your account?"
          message="You will need to sign in again to access your profile, saved content, and account features."
          confirmLabel="Sign out"
          cancelLabel="Cancel"
          confirmVariant="danger"
          loading={isSigningOut}
          errorMessage={signOutError || undefined}
          onConfirm={() => void performSignOut()}
          onCancel={() => {
            if (isSigningOut) return;
            setIsConfirmOpen(false);
            setSignOutError("");
          }}
        />
      )}
    </>
  );
};
