import { Card } from '@heroui/react';
import type { StoreProduct } from '../../types';
import { useNavigate } from 'react-router-dom';

interface ProductPreviewCardProps {
  product: StoreProduct;
}

export default function ProductPreviewCard({ product }: ProductPreviewCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className="h-full w-full cursor-pointer rounded-xl border border-slate-200/80 bg-white shadow-none transition-shadow duration-300 hover:shadow-xl hover:shadow-black/10"
      onClick={() => navigate(`/store/product/${product.id}`)}
    >
      <Card.Content className="p-2 sm:p-3">
        <div className="mb-2 aspect-square w-full overflow-hidden rounded-lg sm:mb-3">
          <img
            src={product.images?.[0] || '/placeholder.png'}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        </div>

        <h3 className="mb-1 line-clamp-2 text-xs font-semibold leading-snug text-[#0B2A4A] sm:text-sm">
          {product.name}
        </h3>

        <p className="mb-2 text-base font-bold text-[#0f3d78] sm:mb-3 sm:text-lg">
          ${product.price_amount.toFixed(2)}
        </p>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/store/product/${product.id}`);
          }}
          className="w-full rounded-lg border-2 border-blue-600 bg-white py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 sm:py-2 sm:text-sm"
        >
          View Product
        </button>
      </Card.Content>
    </Card>
  );
}