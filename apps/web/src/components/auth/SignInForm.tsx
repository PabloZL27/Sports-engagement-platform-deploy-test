import React, { useState } from "react";
import { Auth } from "../../context/AuthContext";
import { Button, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { SigninWithGoogle } from "./SigninGoogle";

interface SignInProps {
    onSuccess: () => void;
    onSwitchToSignUp: () => void;
}

interface AuthFormShellProps {
    title: string;
    description: string;
    children: React.ReactNode;
}

const AuthFormShell = ({ title, description, children }: AuthFormShellProps) => (
    <div className="p-4">
        <div className="mb-6">
            <h1 className="text-[28px] font-bold leading-tight text-[#0B2A4A]">{title}</h1>
            <p className="mt-2 text-[16px] leading-6 text-[#5B6475]">{description}</p>
        </div>
        {children}
    </div>
);

const Divider = ({ label }: { label: string }) => (
    <div className="flex w-full items-center gap-4">
        <span className="h-px flex-1 bg-slate-300" />
        <p className="m-0 whitespace-nowrap text-sm tracking-[0.08em] text-slate-500">{label}</p>
        <span className="h-px flex-1 bg-slate-300" />
    </div>
);

export const SigninWithEmailForm = ({onSuccess,onSwitchToSignUp}: SignInProps) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { SignInUser } = Auth();

    const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const result = await SignInUser(email, password);
    
            if (!result.success) {
                setError(result.error ?? `An unexpected error occurred during sign in ${error}`);
                return;
            }

            onSuccess();
        } catch(error) {
            console.error("Error signing up outside context ", error);
            setError("An unexpected error occurred during sign in.");
        } finally {
            setLoading(false);
        }

    };

    return (
        <AuthFormShell
            title="Welcome Back"
            description="Log in to your Titans Crew account"
        >
            <Form className="flex w-full max-w-md flex-col gap-4" onSubmit={handleSignIn}>
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <TextField
                        isRequired
                        name="email"
                        type="email"
                        onChange={setEmail}
                        validate={(value) => {
                            if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
                                return "Please enter a valid email address";
                            }
                            return null;
                        }}
                        >
                        <Label>Email</Label>
                        <Input placeholder="john@example.com" />
                        <FieldError />
                    </TextField>
                    <TextField
                        isRequired
                        minLength={8}
                        name="password"
                        type="password"
                        onChange={setPassword}
                        validate={(value) => {
                            if (value.length < 8) {
                                return "Password must be at least 8 characters";
                            }
                            if (!/[A-Z]/.test(value)) {
                                return "Password must contain at least one uppercase letter";
                            }
                            if (!/[0-9]/.test(value)) {
                                return "Password must contain at least one number";
                            }
                            return null;
                        }}
                        >
                        <Label>Password</Label>
                        <Input placeholder="Enter your password" />
                        <FieldError />
                    </TextField>
                </div>

                <div className="flex flex-col gap-3">
                    {error && (
                        <p className="text-center text-sm text-red-600">
                            {error}
                        </p>
                    )}
                    <Button
                        isDisabled={loading || !email || !password}
                        type="submit"
                        className="h-14 w-full rounded-2xl bg-slate-800"
                    >
                        {loading ? "Signing In..." : "Sign In"}
                    </Button>
                </div>

                <Divider label="OR CONTINUE WITH" />

                <div className="flex flex-col items-center gap-4">
                    <SigninWithGoogle />
                    <p className="mt-2 text-[16px] leading-6 text-[#5B6475]">
                        Don&apos;t have an account?{" "}
                        <button type="button" onClick={onSwitchToSignUp} className="hover:cursor-pointer">
                            <span className="font-semibold text-slate-900">Sign Up</span>
                        </button>
                    </p>
                </div>
            </Form>
        </AuthFormShell>
    );
};
