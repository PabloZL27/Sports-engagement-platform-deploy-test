import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import checkIcon from "../assets/icons/check-success.svg";

function PaySuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = window.setTimeout(() => navigate("/store", { replace: true }), 10_000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-6">
      <div className="max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl">
        <img src={checkIcon} alt="" className="mx-auto mb-4 h-16 w-16" />
        <h1 className="text-xl font-bold text-[#0B2A4A]">Purchase Successful</h1>
        <p className="mt-2 text-sm text-slate-600">Thank you for your purchase.</p>
        <p className="mt-1 text-xs text-slate-500">This window will close in 10 seconds.</p>
        <button
          type="button"
          className="mt-4 w-full rounded-full bg-[#0B2A4A] py-2 text-white"
          onClick={() => navigate("/store", { replace: true })}
        >
          Back to store
        </button>
      </div>
    </div>
  );
}

export default PaySuccess;