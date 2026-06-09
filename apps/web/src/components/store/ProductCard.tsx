import { Card, Button } from '@heroui/react';
import type { StoreProduct } from '../../types';
import { useNavigate } from 'react-router-dom';
import StoreTag from './StoreTag';

interface ProductCardProps {
  product: StoreProduct;
  onAddToCart: (product: StoreProduct) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/store/product/${product.id}`);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
  };

  return (
    <div onClick={handleCardClick} className="flex h-full cursor-pointer">
      <Card className="flex h-full w-full min-w-0 flex-col transition-shadow hover:shadow-lg">
        <Card.Content className="flex flex-1 flex-col p-2 sm:p-4">
          <div className="mb-2 flex flex-row flex-nowrap items-center gap-1 sm:mb-3 sm:gap-2">
            <StoreTag label={product.rarity} kind="rarity" />
            <StoreTag label={product.type} kind="type" />
          </div>

          <div className="mb-2 aspect-square w-full overflow-hidden rounded-lg sm:mb-3">
            <img
              src={product.images?.[0] || '/placeholder.png'}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="mt-auto space-y-1">
            <div className="min-h-[2.5rem] sm:min-h-[3rem]">
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[#0B2A4A] sm:text-lg">
                {product.name}
              </h3>
            </div>
            <p className="text-lg font-bold text-[#0f3d78] sm:text-2xl">
              ${product.price_amount.toFixed(2)}
            </p>
          </div>
        </Card.Content>

        <Card.Footer className="mt-auto px-2 pb-2 pt-0 sm:px-4 sm:pb-4">
          <Button
            color="primary"
            className="w-full text-xs sm:text-sm"
            onClick={handleAddToCart}
          >
            Add to Cart
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}