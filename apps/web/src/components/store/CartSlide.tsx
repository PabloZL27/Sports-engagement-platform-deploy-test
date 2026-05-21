import { Button } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import closeIcon from '../../assets/icons/close.svg';
import { createCheckout } from '../../services/storeService';
import CartLine from './CartLine';
import { useEffect, useState } from 'react';

function resolveStripePriceId(
  defaultPrice: string | { id: string }
): string {
  if (typeof defaultPrice === 'object' && defaultPrice !== null && 'id' in defaultPrice) {
    return defaultPrice.id;
  }
  return String(defaultPrice);
}

export default function CartSlide() {
  const navigate = useNavigate();
  const {
    cart,
    isCartOpen,
    closeCart,
    cartItemCount,
    cartSubtotal,
    clearCart,
    addedToast,
    clearAddedToast,
  } = useCart();

  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (addedToast && isCartOpen) {
      setShowToast(true);
      const timer = setTimeout(() => {
        setShowToast(false);
        clearAddedToast();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [addedToast, isCartOpen, clearAddedToast]);

  if (!isCartOpen) return null;

  async function goToCheckout() {
    if (cart.length === 0) return;
    
    try {
      // Construir array de line_items con todos los productos del carrito
      const lineItems = cart.map((item) => ({
        price: resolveStripePriceId(item.product.default_price),
        quantity: item.quantity,
      }));

      const { url } = await createCheckout(lineItems);
      clearCart();
      closeCart();
      window.location.href = url;
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex"
      role="dialog"
      aria-modal="true"
      aria-label="Cart"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={closeCart}
        aria-label="Close cart"
      />
      <aside className="relative ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-[#0B2A4A]">
            Cart ({cartItemCount})
          </h2>
          <button
            type="button"
            onClick={closeCart}
            className="rounded-full p-2 hover:bg-slate-100"
            aria-label="Close"
          >
            <img src={closeIcon} alt="" className="h-5 w-5" />
          </button>
        </div>

        {/* Toast "Added to cart" dentro del slide */}
        {showToast && (
          <div className="mx-4 mt-2 animate-fade-in rounded-lg bg-green-600 px-4 py-3 text-center text-sm font-medium text-white shadow-lg">
            ✓ Added to cart
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {cart.length === 0 ? (
            <p className="text-sm text-slate-500">Your cart is empty.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {cart.map((line) => (
                <li key={`${line.product.id}-${line.selectedSize ?? 'none'}`}>
                  <CartLine line={line} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-200 p-4">
          <div className="mb-3 flex justify-between text-[#0B2A4A]">
            <span className="font-medium">Subtotal</span>
            <span className="text-xl font-bold">
              ${cartSubtotal.toFixed(2)}
            </span>
          </div>
          <Button
            color="primary"
            className="mb-2 w-full"
            isDisabled={cart.length === 0}
            onPress={goToCheckout}
          >
            Checkout
          </Button>
          <Button
            variant="bordered"
            className="w-full"
            onPress={() => {
              closeCart();
              navigate('/store');
            }}
          >
            Continue shopping
          </Button>
        </div>
      </aside>
    </div>
  );
}