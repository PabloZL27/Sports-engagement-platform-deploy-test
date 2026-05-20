import { Card, Button, Chip } from '@heroui/react';
import type { StoreProduct } from '../../types';
import { useNavigate } from 'react-router-dom';

interface ProductCardProps {
  product: StoreProduct;
  onAddToCart: (product: StoreProduct) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const navigate = useNavigate();

  const rarityColors = {
    'New': 'success',      
    'Popular': 'warning',  
    'Limited': 'danger'    
  } as const;

  const typeColors = {
    'Jerseys': 'primary',
    'Headwear': 'secondary',
    'Performance': 'default',
    'Collectibles': 'default'
  } as const;

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
          <div className="flex gap-2 mb-3">
            <Chip
              color={rarityColors[product.rarity]}
              variant="flat"
              size="sm"
            >
              {product.rarity}
            </Chip>
            <Chip
              color={typeColors[product.type]}
              variant="flat"
              size="sm"
            >
              {product.type}
            </Chip>
          </div>

          <div className="w-full aspect-square mb-3 overflow-hidden rounded-lg">
            <img
              src={product.images?.[0] || '/placeholder.png'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="mt-auto space-y-1">
            <h3 className="min-h-[3.5rem] font-semibold text-lg leading-snug text-[#0B2A4A] line-clamp-2">
              {product.name}
            </h3>
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