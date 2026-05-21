import { useCart } from '../../context/CartContext';
import cartIcon from '../../assets/icons/cart.svg';

export default function CartButton() {
  const { openCart, cartItemCount } = useCart();

  return (
    <button
      onClick={openCart}
      className="relative inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
    >
      <img src={cartIcon} alt="" className="h-5 w-5 brightness-0 invert" />
      <span>Cart</span>
      {cartItemCount > 0 && (
        <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
          {cartItemCount}
        </span>
      )}
    </button>
  );
}