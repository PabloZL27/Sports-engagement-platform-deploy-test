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
      <Card.Content className="p-3">
        <div className="mb-3 aspect-square w-full overflow-hidden rounded-lg">
          <img
            src={product.images?.[0] || '/placeholder.png'}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        </div>

        <h3 className="mb-1 line-clamp-2 text-sm font-semibold leading-snug text-[#0B2A4A]">
          {product.name}
        </h3>

        <p className="mb-3 text-lg font-bold text-[#0f3d78]">
          ${product.price_amount.toFixed(2)}
        </p>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/store/product/${product.id}`);
          }}
          className="w-full rounded-lg border-2 border-blue-600 bg-white py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50"
        >
          View Product
        </button>
      </Card.Content>
    </Card>
  );
}