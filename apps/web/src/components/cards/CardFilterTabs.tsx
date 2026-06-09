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

function FilterButton({
  filterKey,
  label,
  isSel,
  onFilterChange,
  compact,
}: {
  filterKey: CardFilter;
  label: string;
  isSel: boolean;
  onFilterChange: (filter: CardFilter) => void;
  compact?: boolean;
}) {
  return (
    <button
      key={filterKey}
      type="button"
      role="tab"
      aria-selected={isSel}
      id={`filter-tab-${filterKey}`}
      className={`shrink-0 rounded-lg font-semibold outline-none transition-all duration-200 ${
        compact ? "px-3 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm" : "px-5 py-2.5 text-sm"
      } ${
        isSel
          ? "bg-[#0f1b2d] text-white shadow-md"
          : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
      }`}
      onClick={() => onFilterChange(filterKey)}
    >
      {label}
    </button>
  );
}

export default function CardFilterTabs({ selected, onFilterChange }: CardFilterTabsProps) {
  return (
    <>
      <div className="w-full max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
        <div
          role="tablist"
          aria-label="Card filters"
          className="inline-flex min-w-max gap-1.5 rounded-xl bg-gray-100 p-1 sm:gap-2 sm:p-1.5"
        >
          {filters.map((f) => (
            <FilterButton
              key={f.key}
              filterKey={f.key}
              label={f.label}
              isSel={selected === f.key}
              onFilterChange={onFilterChange}
              compact
            />
          ))}
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Card filters"
        className="hidden gap-2 rounded-xl bg-gray-100 p-1.5 lg:inline-flex"
      >
        {filters.map((f) => (
          <FilterButton
            key={f.key}
            filterKey={f.key}
            label={f.label}
            isSel={selected === f.key}
            onFilterChange={onFilterChange}
          />
        ))}
      </div>
    </>
  );
}
