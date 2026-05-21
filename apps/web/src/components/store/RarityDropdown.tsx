interface RarityDropdownProps {
  selectedRarity: string | null;
  onRarityChange: (rarity: string | null) => void;
}

const RARITIES = [
  { key: 'all', label: 'All Rarities' },
  { key: 'New', label: 'New' },
  { key: 'Popular', label: 'Popular' },
  { key: 'Limited', label: 'Limited' },
];

export default function RarityDropdown({ selectedRarity, onRarityChange }: RarityDropdownProps) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-[#0B2A4A] mb-3">Filter by Rarity</h3>
      <select
        value={selectedRarity || 'all'}
        onChange={(e) => {
          const value = e.target.value;
          onRarityChange(value === 'all' ? null : value);
        }}
        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
      >
        {RARITIES.map((rarity) => (
          <option key={rarity.key} value={rarity.key}>
            {rarity.label}
          </option>
        ))}
      </select>
    </div>
  );
}