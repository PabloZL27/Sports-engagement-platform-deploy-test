import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { Session } from "@supabase/supabase-js";
import { InsertNewUserRequest } from "../types";
import { insertNewUser, getMyProfile } from "../services/profileService";

interface AuthContextType {
  session: Session | null;
  role: string | null;
  loading: boolean;
  signUpNewUser: (email: string, password: string, fullName: string) => Promise<any>;
  SignInUser: (email: string, password: string) => Promise<any>;
  SignInWithGoogle: () => Promise<any>;
  SignOut: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthContextProps extends React.PropsWithChildren {
  children: ReactNode;
}

export const AuthContextProvider = ({ children }: AuthContextProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const profileSyncedRef = useRef(false);

  const buildProfilePayload = (s: Session): InsertNewUserRequest => {
    const fullName = (s.user.user_metadata?.full_name || "").trim();
    const [first_name, ...rest] = fullName.split(/\s+/).filter(Boolean);
    const last_name = rest.join(" ");

    return {
      user_id: s.user.id,
      country: "",
      first_name: first_name || "User",
      last_name: last_name || "",
      username:
        s.user.email?.split("@")[0] || `user_${s.user.id.slice(0, 8)}`,
      avatar_url: s.user.user_metadata?.avatar_url || "",
    };
  };

  const syncProfileToOwnDb = async (s: Session) => {
    try {
      const payload = buildProfilePayload(s);
      await insertNewUser(payload);
      return true;
    } catch (err: any) {
      const msg = String(err?.message || "").toLowerCase();
      if (
        msg.includes("duplicate") ||
        msg.includes("already exists") ||
        msg.includes("http error 409")
      ) {
        return true;
      }
      console.error("Error creating profile in own DB", err);
      return false;
    }
  };

  const fetchProfile = async (s: Session) => {
    try {
      const data = await getMyProfile(s.access_token);
      if (data.status === "success") {
        setRole(data.profile.role);
      }
      return data.profile;
    } catch (err: any) {
      console.error("Error fetching profile:", err);
      setRole(null);
      return null;
    }
  };

  const authUnavailableResponse = {
    success: false,
    error: "Authentication is not configured in this frontend.",
  };

  const signUpNewUser = async (
    email: string,
    password: string,
    fullName: string,
  ) => {
    if (!supabase) {
      return authUnavailableResponse;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      console.error("Error signing up: ", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      user: data,
    };
  };

  const SignInUser = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        console.error("Sign in error ", error);
        return {
          success: false,
          error: error.message,
        };
      }
      console.log("Successful sign in ", data.session);
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("An error ocurred while siging in ", error);
    }
  };

  const SignInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      console.error("Error with google sign in provider ", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data,
    };
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session && !profileSyncedRef.current) {
        profileSyncedRef.current = true;
        profileSyncedRef.current = await syncProfileToOwnDb(session);
      }
      if (session) {
        await fetchProfile(session);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session && !profileSyncedRef.current) {
        profileSyncedRef.current = true;
        profileSyncedRef.current = await syncProfileToOwnDb(session);
      }
      if (!session) {
        profileSyncedRef.current = false;
        setRole(null);
      }
      if (session) {
        await fetchProfile(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const SignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("There was an error while signing out ", error);
    } else {
      console.log("Signed out user");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        role,
        loading,
        signUpNewUser,
        SignInUser,
        SignInWithGoogle,
        SignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const Auth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthContextProvider");
  }

  return context;
};