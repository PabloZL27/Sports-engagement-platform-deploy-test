import { Button, Chip } from '@heroui/react';
import { useState } from 'react';
import type { CartItem } from '../../types';
import { useCart } from '../../context/CartContext';
import trashIcon from '../../assets/icons/trash.svg';
import plusIcon from '../../assets/icons/plus.svg';
import minusIcon from '../../assets/icons/minus.svg';

type Props = { line: CartItem };

export default function CartLine({ line }: Props) {
  const { product, quantity, selectedSize } = line;
  const { updateQuantity, removeFromCart, openCart } = useCart();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const lineKeySize = selectedSize;

  const lineTotal = product.price_amount * quantity;

  function handleRemove() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      window.setTimeout(() => setConfirmDelete(false), 2500);
      return;
    }
    removeFromCart(product.id);
    setConfirmDelete(false);
  }

  return (
    <div className="flex gap-3 rounded-lg border border-slate-200 p-2">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded bg-slate-100">
        <img
          src={product.images?.[0] ?? '/placeholder.png'}
          alt={product.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-[#0B2A4A]">{product.name}</p>
        {selectedSize ? (
          <Chip size="sm" variant="flat" className="mt-0.5">
            Size: {selectedSize}
          </Chip>
        ) : null}
        <p className="text-sm text-slate-600">
          ${lineTotal.toFixed(2)}
        </p>
        <div className="mt-1 flex items-center gap-1">
          <Button
            isIconOnly
            size="sm"
            variant="flat"
            isDisabled={quantity <= 1}
            onPress={() =>
              updateQuantity(
                product.id,
                Math.max(1, quantity - 1)
              )
            }
            aria-label="Decrease"
          >
            <img src={minusIcon} alt="" className="h-4 w-4" />
          </Button>
          <span className="min-w-[2ch] text-center text-sm">{quantity}</span>
          <Button
            isIconOnly
            size="sm"
            variant="flat"
            onPress={() => updateQuantity(product.id, quantity + 1)}
            aria-label="Increase"
          >
            <img src={plusIcon} alt="" className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex flex-col items-end justify-between">
        <Button
          isIconOnly
          size="sm"
          variant="light"
          color={confirmDelete ? 'danger' : 'default'}
          onPress={handleRemove}
          aria-label={confirmDelete ? 'Confirm removal' : 'Remove product'}
        >
          <img src={trashIcon} alt="" className="h-5 w-5" />
        </Button>

        {confirmDelete && (
          <p className="mt-1 text-xs font-medium text-red-600">
            Click again to remove
          </p>
        )}
        
      </div>
    </div>
  );
}