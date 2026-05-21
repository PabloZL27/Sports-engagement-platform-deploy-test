import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Chip} from '@heroui/react';
import Navbar from '../components/layout/Navbar';
import { getProducts } from '../services/storeService';
import type { StoreProduct } from '../types';
import { useCart } from '../context/CartContext';
import { enrichProductsWithTags } from '../data/mockProducts';
import backIcon from '../assets/icons/back-arrow.svg';
import shippingIcon from '../assets/icons/shipping.svg';
import chevronDownIcon from '../assets/icons/chevron-down.svg';
import chevronUpIcon from '../assets/icons/chevron-up.svg';
import CartButton from '../components/store/CartButton';
import CartSlide from '../components/store/CartSlide';

const CLOTHING_TYPES: StoreProduct['type'][] = ['Jerseys', 'Headwear', 'Performance'];

function isClothing(p: StoreProduct) {
  return CLOTHING_TYPES.includes(p.type);
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState<string>('');
  const [shippingOpen, setShippingOpen] = useState(false);
  const [descOpen, setDescOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { products } = await getProducts();
        const list = enrichProductsWithTags(products);
        const found = list.find((p) => p.id === id) ?? null;
        if (!cancelled) {
          setProduct(found);
          if (found && isClothing(found) && found.sizes?.length) {
            setSize(found.sizes[0]!);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const showSize = product && isClothing(product) && (product.sizes?.length ?? 0) > 0;

  const typeColors = {
    Jerseys: 'primary',
    Headwear: 'secondary',
    Performance: 'success',
    Collectibles: 'default',
  } as const;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F5F7]">
        <div className="mx-auto w-full max-w-[1400px] px-6">
          <Navbar />
        </div>
        <main className="mx-auto max-w-[1400px] p-6">Loading…</main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] p-6">
        <p>Product not found.</p>
        <Button onPress={() => navigate('/store')}>Back to store</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <main className="mx-auto w-full max-w-[1400px] p-6">
        <Navbar />
        
        {/* Barra con Back y Cart Button */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/store')}
            className="inline-flex items-center gap-2 text-[#0B2A4A] hover:underline"
          >
            <img src={backIcon} alt="" className="h-5 w-5" />
            Back to store
          </button>
          <CartButton />
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <img
              src={product.images?.[0] ?? '/placeholder.png'}
              alt={product.name}
              className="aspect-square w-full object-cover"
            />
          </div>

          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-[#0B2A4A]">{product.name}</h1>
              <div className="mt-2 flex flex-wrap gap-2">
                <Chip color="success" variant="flat" size="sm">
                  {product.rarity}
                </Chip>
                <Chip color={typeColors[product.type]} variant="flat" size="sm">
                  {product.type}
                </Chip>
              </div>
              <p className="mt-3 text-3xl font-bold text-[#0f3d78]">
                ${product.price_amount.toFixed(2)}
              </p>
            </div>

            {showSize && product.sizes ? (
              <div className="max-w-xs">
                <label htmlFor="product-size" className="mb-1 block text-sm font-medium text-[#0B2A4A]">
                  Size
                </label>
                <select
                  id="product-size"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#0B2A4A] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {product.sizes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="flex max-w-xs items-center gap-3">
              <span className="text-sm text-slate-600">Quantity</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  isIconOnly
                  variant="flat"
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  -
                </Button>
                <span>{quantity}</span>
                <Button
                  size="sm"
                  isIconOnly
                  variant="flat"
                  onPress={() => setQuantity((q) => q + 1)}
                >
                  +
                </Button>
              </div>
            </div>

            <Button
              color="primary"
              className="w-full max-w-md"
              onPress={() => {
                addToCart(
                  product,
                  quantity,
                  showSize ? size : undefined
                );
              }}
            >
              Add to cart
            </Button>

            <div className="border-t border-slate-300 pt-2">
              <button
                type="button"
                onClick={() => setShippingOpen((o) => !o)}
                className="flex w-full items-center justify-between py-2 text-left font-medium text-[#0B2A4A]"
              >
                <span className="inline-flex items-center gap-2">
                  <img src={shippingIcon} alt="" className="h-5 w-5" />
                  Shipping
                </span>
                <img
                  src={shippingOpen ? chevronUpIcon : chevronDownIcon}
                  alt=""
                  className="h-4 w-4"
                />
              </button>
              {shippingOpen ? (
                <p className="pb-3 pt-2 text-sm text-slate-600">
                  Free standard shipping on orders over $75. Expedited shipping available at checkout. 
                  Orders typically arrive within 5-7 business days. International shipping may take 10-14 days. 
                  All orders are processed within 1-2 business days.
                </p>
              ) : null}
            </div>

            <div className="border-t border-slate-300 pt-2">
              <button
                type="button"
                onClick={() => setDescOpen((o) => !o)}
                className="flex w-full items-center justify-between py-2 text-left font-medium text-[#0B2A4A]"
              >
                <span>Description</span>
                <img
                  src={descOpen ? chevronUpIcon : chevronDownIcon}
                  alt=""
                  className="h-4 w-4"
                />
              </button>
              {descOpen ? (
                <div className="pb-3 pt-2 text-sm text-slate-600">
                  {product.description ?? 'No description for this product.'}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>

      <CartSlide />
    </div>
  );
}