import type { StoreProduct } from '../types';

type StoreProductType = StoreProduct['type'];
type StoreProductRarity = StoreProduct['rarity'];

/** Legacy fallback for products created before Stripe metadata was wired up. */
export const MOCK_PRODUCT_TAGS: Record<
  string,
  {
    rarity: StoreProductRarity;
    type: StoreProductType;
    sizes?: string[];
  }
> = {
  prod_UPQCnB0ZtXV2Bz: { rarity: 'New', type: 'Collectibles' },
  prod_UPQBNx4ZKCifci: { rarity: 'Popular', type: 'Headwear' },
  prod_UPQAdmliBYYRfy: {
    rarity: 'Limited',
    type: 'Performance',
    sizes: ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '12'],
  },
  prod_U7r90owRS9NMSE: {
    rarity: 'Popular',
    type: 'Jerseys',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
  },
};

const CATEGORY_TO_STORE_TYPE: Record<string, StoreProductType> = {
  Clothing: 'Jerseys',
  Footwear: 'Performance',
  Accessories: 'Headwear',
  Collectibles: 'Collectibles',
  'Home Goods': 'Collectibles',
};

const PRODUCT_TYPE_TO_STORE_TYPE: Record<string, StoreProductType> = {
  clothing: 'Jerseys',
  footwear: 'Performance',
  no_size: 'Collectibles',
};

const ADMIN_RARITY_TO_STORE: Record<string, StoreProductRarity> = {
  Standard: 'Popular',
  New: 'New',
  Limited: 'Limited',
};

interface StripePriceVariant {
  priceId?: string;
  size?: string | null;
  unit_amount?: number | null;
  inventory_count?: number;
}

interface StripeStoreProduct {
  id: string;
  name: string;
  description?: string | null;
  images?: string[];
  metadata?: {
    category?: string;
    product_type?: string;
    rarity?: string;
  };
  default_price?: unknown;
  variants?: StripePriceVariant[];
}

function priceAmountInMajorUnits(product: { default_price?: unknown }): number {
  const dp = product.default_price;
  if (dp && typeof dp === 'object' && dp !== null) {
    const o = dp as {
      unit_amount?: number | null;
      unit_amount_decimal?: string | null;
    };
    if (typeof o.unit_amount === 'number' && Number.isFinite(o.unit_amount)) {
      return o.unit_amount / 100;
    }
    if (
      typeof o.unit_amount_decimal === 'string' &&
      o.unit_amount_decimal.trim()
    ) {
      const parsed = Number.parseFloat(o.unit_amount_decimal);
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }
  if (typeof dp === 'string' && !dp.startsWith('price_')) {
    const raw = Number.parseFloat(dp.replace(/[^0-9.]/g, ''));
    return Number.isFinite(raw) ? raw : 0;
  }
  return 0;
}

function sizesFromVariants(variants: StripePriceVariant[] | undefined): string[] | undefined {
  if (!variants?.length) return undefined;

  const sizes = variants
    .map((v) => v.size)
    .filter((size): size is string => !!size && size !== 'one-size');

  return sizes.length ? sizes : undefined;
}

function mapStoreType(product: StripeStoreProduct): StoreProductType {
  const category = product.metadata?.category?.trim();
  if (category && CATEGORY_TO_STORE_TYPE[category]) {
    return CATEGORY_TO_STORE_TYPE[category];
  }

  const productType = product.metadata?.product_type?.trim();
  if (productType && PRODUCT_TYPE_TO_STORE_TYPE[productType]) {
    return PRODUCT_TYPE_TO_STORE_TYPE[productType];
  }

  return MOCK_PRODUCT_TAGS[product.id]?.type ?? 'Collectibles';
}

function mapStoreRarity(product: StripeStoreProduct): StoreProductRarity {
  const rarity = product.metadata?.rarity?.trim();
  if (rarity && ADMIN_RARITY_TO_STORE[rarity]) {
    return ADMIN_RARITY_TO_STORE[rarity];
  }

  return MOCK_PRODUCT_TAGS[product.id]?.rarity ?? 'New';
}

function mapProductType(
  product: StripeStoreProduct,
): StoreProduct['product_type'] {
  const raw = product.metadata?.product_type?.trim();
  if (raw === 'clothing' || raw === 'footwear' || raw === 'no_size') {
    return raw;
  }

  const category = product.metadata?.category?.trim();
  if (category === 'Clothing') return 'clothing';
  if (category === 'Footwear') return 'footwear';
  if (category) return 'no_size';

  const legacySizes = MOCK_PRODUCT_TAGS[product.id]?.sizes;
  return legacySizes?.length ? 'clothing' : 'no_size';
}

export function enrichProductsWithTags(products: StripeStoreProduct[]): StoreProduct[] {
  return products.map((product) => {
    const legacy = MOCK_PRODUCT_TAGS[product.id];
    const hasMetadata =
      !!product.metadata?.category ||
      !!product.metadata?.product_type ||
      !!product.metadata?.rarity;

    const type = hasMetadata ? mapStoreType(product) : legacy?.type ?? 'Collectibles';
    const rarity = hasMetadata ? mapStoreRarity(product) : legacy?.rarity ?? 'New';
    const product_type = hasMetadata ? mapProductType(product) : undefined;
    const sizes =
      sizesFromVariants(product.variants) ??
      legacy?.sizes;

    const variants = product.variants
      ?.filter((v) => v.priceId && v.size && v.size !== 'one-size')
      .map((v) => ({
        priceId: v.priceId!,
        size: v.size!,
        unit_amount: v.unit_amount ?? 0,
        inventory_count: v.inventory_count,
      }));

    return {
      ...product,
      type,
      rarity,
      product_type,
      sizes,
      variants,
      price_amount: priceAmountInMajorUnits(product),
    };
  });
}
