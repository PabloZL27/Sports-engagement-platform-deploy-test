import React from "react";
import { Auth } from "../../context/AuthContext"
import { useNavigate } from "react-router-dom";

export const SignOutButton = () => {
    const { SignOut } = Auth();
    const navigate = useNavigate();

    const handleSignOut = async (e: React.MouseEvent<HTMLButtonElement>) => {
        try{
            await SignOut();
            navigate("/")
        } catch(err) {
            console.error(err);
        }
    }
    
    return(
        <>
            <button onClick={handleSignOut} className="
    px-4 py-1.5
    bg-red-600
    text-white
    font-semibold
    rounded-full
    shadow-[0_10px_25px_rgba(255,0,0,0.35)]
    transition-all duration-200
    hover:bg-red-700
    hover:scale-105
    active:scale-95
  ">
                Sign Out
            </button>
        </>
    )
}