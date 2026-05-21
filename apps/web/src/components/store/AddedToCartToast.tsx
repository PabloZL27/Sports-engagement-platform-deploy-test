import { useEffect } from "react";
import { useCart } from "../../context/CartContext";

export default function AddedToCartToast() {
  const { addedToast, clearAddedToast } = useCart();

  useEffect(() => {
    if (!addedToast) return;
    const id = window.setTimeout(() => clearAddedToast(), 2000);
    return () => clearTimeout(id);
  }, [addedToast, clearAddedToast]);

  if (!addedToast) return null;

  return (
    <div
      role="status"
      className="fixed bottom-24 left-1/2 z-[110] -translate-x-1/2 rounded-full bg-[#0B2A4A] px-5 py-2.5 text-sm font-medium text-white shadow-lg"
    >
      Added to cart
    </div>
  );
}