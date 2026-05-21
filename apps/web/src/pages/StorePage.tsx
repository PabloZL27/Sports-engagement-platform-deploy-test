import { useEffect, useState, useMemo } from 'react';
import { getProducts } from '../services/storeService';
import type { StoreProduct } from '../types';
import Navbar from '../components/layout/Navbar';
import ProductCard from '../components/store/ProductCard';
import FilterBar from '../components/store/FilterBar';
import RarityDropdown from '../components/store/RarityDropdown';
import ProductCounter from '../components/store/ProductCounter';
import CartButton from '../components/store/CartButton';
import { useCart } from '../context/CartContext';
import { enrichProductsWithTags } from '../data/mockProducts';
import CartSlide from '../components/store/CartSlide';
import '../styles/store.css';

const DEFAULT_SLIDER_MAX = 200;

function getSafeMaxPriceFromProducts(list: StoreProduct[]): number {
  const amounts = list
    .map((p) => p.price_amount)
    .filter((n) => Number.isFinite(n) && n >= 0);
  if (amounts.length === 0) {
    return Math.max(1, DEFAULT_SLIDER_MAX);
  }
  return Math.max(1, ...amounts, DEFAULT_SLIDER_MAX);
}

export default function StorePage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, DEFAULT_SLIDER_MAX]);

  const { addToCart } = useCart();

  useEffect(() => {
    getProducts()
      .then((res) => {
        const enrichedProducts = enrichProductsWithTags(res.products);
        setProducts(enrichedProducts);
        const top = getSafeMaxPriceFromProducts(enrichedProducts);
        setPriceRange([0, top]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const maxPrice = useMemo(
    () => getSafeMaxPriceFromProducts(products),
    [products]
  );

  useEffect(() => {
    setPriceRange(([lo, hi]) => {
      if (hi > maxPrice) {
        return [lo, maxPrice];
      }
      return [lo, hi];
    });
  }, [maxPrice]);

  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (selectedType) {
      filtered = filtered.filter((p) => p.type === selectedType);
    }

    if (selectedRarity) {
      filtered = filtered.filter((p) => p.rarity === selectedRarity);
    }

    filtered = filtered.filter((p) => {
      if (!Number.isFinite(p.price_amount)) {
        return false;
      }
      return (
        p.price_amount >= priceRange[0] && p.price_amount <= priceRange[1]
      );
    });

    return filtered;
  }, [products, selectedType, selectedRarity, priceRange]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F5F7]">
        <div className="mx-auto w-full max-w-[1400px] px-6 pt-4">
          <Navbar />
        </div>
        
        <main className="mx-auto w-full max-w-[1400px] px-6 pt-6">
          <p className="text-gray-600">Loading products…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <main className="mx-auto w-full max-w-[1400px] p-6">
        <Navbar />
        <section
          className="store-hero-bar mb-8"
          aria-label="Store"
        >
          <h1 className="store-hero-title store-hero-title--onblue">Store</h1>
          <p className="store-hero-subtitle store-hero-subtitle--onblue">
            Find the best Titans products
          </p>
        </section>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
          <aside className="space-y-4 lg:col-span-1">
            <RarityDropdown
              selectedRarity={selectedRarity}
              onRarityChange={setSelectedRarity}
            />
            <FilterBar
              selectedType={selectedType}
              onTypeChange={setSelectedType}
              priceRange={priceRange}
              onPriceChange={(value) =>
                setPriceRange(value as [number, number])
              }
              maxPrice={maxPrice}
            />
          </aside>

          <div className="lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <ProductCounter
                count={filteredProducts.length}
                totalCount={products.length}
              />
              <CartButton />
            </div>

            <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={(product) => addToCart(product, 1)}
                />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-gray-600">
                  No products found with these filters
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <CartSlide />
    </div>
  );
}