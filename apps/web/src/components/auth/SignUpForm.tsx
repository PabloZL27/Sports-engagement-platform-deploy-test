"use client"

import React, { useState } from "react";
import { Auth } from "../../context/AuthContext";
import { Button, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { SigninWithGoogle } from "./SigninGoogle";

interface SignUpProps {
    onSuccess: () => void;
    onSwitchToSignIn: () => void;
}

export const SignupForm = ({ onSuccess, onSwitchToSignIn }: SignUpProps) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confPass, setConfPass] = useState("");
    const [name, setName] = useState(""); //TODO: Use it for own users table
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { signUpNewUser } = Auth();

    const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const supabaseAuthRes = await signUpNewUser(email, password, name);

            if (!supabaseAuthRes.success) {
                setError(supabaseAuthRes.error ?? `An unexpected error occurred during signup ${error}`);
                return;
            }

            setMessage(supabaseAuthRes.message);
            onSuccess();
        } catch (error) {
            console.error("Error signing up outside context ", error);
            setError("An unexpected error occurred during signup.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="mb-6 flex flex-row gap-10">
                <div>
                    <h1 className="text-[28px] font-bold leading-tight text-[#0B2A4A]">Create account</h1>{/* CHECAR SOLORES DE LA PALETA */}
                    <p className="mt-2 text-[16px] leading-6 text-[#5B6475]">Join the community and start earning rewards</p>
                </div>
            </div>
            <Form className="flex w-full max-w-md flex-col gap-4" onSubmit={handleSignUp}>
                <TextField
                    isRequired
                    name="name"
                    type="name"
                    onChange={setName}
                    >
                    <Label>Full Name</Label>
                    <Input placeholder="John Doe" />
                    <FieldError />
                </TextField>
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
                <TextField
                    isRequired
                    minLength={8}
                    name="confirm password"
                    type="password"
                    onChange={setConfPass}
                    validate={() => {
                        if (confPass != password) {
                            return "Please confirm your password correctly";
                        }
                        return null;
                    }}
                    >
                    <Label>Confirm Password</Label>
                    <Input placeholder="Confirm your password" />
                    <FieldError />
                </TextField>
                <p className="text-sm text-slate-600 text-center mt-1.5">
                    I agree to the <span className="font-semibold text-slate-900">Terms & Conditions</span> and{" "}
                    <span className="font-semibold text-slate-900">Privacy Policy</span>
                </p>
                {error && (
                <p className="mt-3 text-center text-sm text-red-600">{error}</p>
                )}
                <div className="max-w">
                    <Button isDisabled={loading || !email || !password || !confPass || password !== confPass} type="submit" className="mt-4 h-14 w-full rounded-2xl bg-slate-800">
                    {loading ? "Creating account..." : "Sign Up"}
                    </Button>
                </div>
            </Form>
            {message && (
                <p className="mt-3 text-center text-sm text-emerald-700">{message}</p>
            )}
            <div className="flex flex-col items-center gap-2 w-full mt-4">
                <span className="h-px flex-1 bg-slate-300" />
                <p className="m-0 whitespace-nowrap text-sm tracking-[0.08em] text-slate-500">
                    OR REGISTER WITH
                </p>
                <span className="h-px flex-1 bg-slate-300" />
                <SigninWithGoogle />
            </div>
            <div className="flex items-center gap-4 mt-4">
                <span className="h-px flex-1 bg-slate-300" />
                <p className="mt-2 text-[16px] leading-6 text-[#5B6475]">Already have one? {" "} 
                    <button type="button" onClick={onSwitchToSignIn} className="hover: cursor-pointer">
                        <span className="font-semibold text-slate-900"> Sign In</span>
                    </button>
                </p>
                <span className="h-px flex-1 bg-slate-300" />
            </div>
        </>
    );
};
