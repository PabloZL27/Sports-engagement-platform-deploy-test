export type CardFilter = "all" | "unlocked" | "locked" | "rare" | "elite" | "titan";

interface CardFilterTabsProps {
  selected: CardFilter;
  onFilterChange: (filter: CardFilter) => void;
}

const filters: { key: CardFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unlocked", label: "Unlocked" },
  { key: "locked", label: "Locked" },
  { key: "rare", label: "Rare" },
  { key: "elite", label: "Elite" },
  { key: "titan", label: "Titan" },
];

export default function CardFilterTabs({ selected, onFilterChange }: CardFilterTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Card filters"
      className="inline-flex gap-2 rounded-xl bg-gray-100 p-1.5"
    >
      {filters.map((f) => {
        const isSel = selected === f.key;
        return (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={isSel}
            id={`filter-tab-${f.key}`}
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold outline-none transition-all duration-200 ${
              isSel
                ? "bg-[#0f1b2d] text-white shadow-md"
                : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
            }`}
            onClick={() => onFilterChange(f.key)}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
