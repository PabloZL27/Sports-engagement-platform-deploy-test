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
      <Card className="flex h-full w-full flex-col hover:shadow-lg transition-shadow">
        <Card.Content className="flex flex-1 flex-col p-4">
          {/* Tags arriba */}
          <div className="mb-3 flex flex-wrap gap-2">
            <StoreTag label={product.rarity} kind="rarity" />
            <StoreTag label={product.type} kind="type" />
          </div>

          <div className="w-full aspect-square mb-3 overflow-hidden rounded-lg">
            <img
              src={product.images?.[0] || '/placeholder.png'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="mt-auto space-y-1">
            <div className="min-h-[3rem]">
              <h3 className="font-semibold text-lg leading-snug text-[#0B2A4A] line-clamp-2">
                {product.name}
              </h3>
            </div>
            <p className="text-2xl font-bold text-[#0f3d78]">
              ${product.price_amount.toFixed(2)}
            </p>
          </div>
        </Card.Content>

        <Card.Footer className="mt-auto pt-0 px-4 pb-4">
          <Button
            color="primary"
            className="w-full"
            onClick={handleAddToCart}
          >
            Add to Cart
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}