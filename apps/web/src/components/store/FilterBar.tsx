import { Button } from '@heroui/react';

interface FilterBarProps {
  selectedType: string | null;
  onTypeChange: (type: string | null) => void;
  priceRange: [number, number];
  onPriceChange: (range: number | number[]) => void;
  maxPrice: number;
}

const PRODUCT_TYPES = [
  { id: null, label: 'All' },
  { id: 'Jerseys', label: 'Jerseys' },
  { id: 'Headwear', label: 'Headwear' },
  { id: 'Performance', label: 'Performance' },
  { id: 'Collectibles', label: 'Collectibles' },
];

export default function FilterBar({
  selectedType,
  onTypeChange,
  priceRange,
  onPriceChange,
  maxPrice,
}: FilterBarProps) {
  const minBound = 0;
  const safeMax = Math.max(
    1,
    Number.isFinite(maxPrice) && maxPrice > 0 ? maxPrice : 200
  );
  const rawUpper = priceRange[1];
  const upper = Math.min(
    Math.max(minBound, Number.isFinite(rawUpper) ? rawUpper : 0),
    safeMax
  );
  const [lo, hi] = [priceRange[0], upper];

  return (
    <div className="space-y-6 rounded-lg bg-white p-6 shadow-sm">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-[#0B2A4A]">Category</h3>
        <div className="flex flex-wrap gap-2">
          {PRODUCT_TYPES.map((type) => (
            <Button
              key={type.label}
              variant={selectedType === type.id ? 'solid' : 'bordered'}
              color={selectedType === type.id ? 'primary' : 'default'}
              size="sm"
              onClick={() => onTypeChange(type.id)}
              className={`
                transition-all duration-200
                ${
                  selectedType === type.id
                    ? 'scale-105 bg-blue-600 text-white shadow-md'
                    : 'border border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm'
                }
              `}
            >
              {type.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-[#0B2A4A]">Price Range</h3>
        <input
          type="range"
          min={minBound}
          max={safeMax}
          step={1}
          value={upper}
          onChange={(e) => {
            const v = Number(e.target.value);
            onPriceChange([lo, v]);
          }}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600"
        />
        <div className="mt-2 flex justify-between text-sm text-gray-600">
          <span className="font-medium">${lo.toFixed(0)}</span>
          <span className="font-medium">${hi.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
}