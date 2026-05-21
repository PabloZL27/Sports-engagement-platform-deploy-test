interface CardSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  ownedOnly: boolean;
  onOwnedToggle: (value: boolean) => void;
}

export default function CardSearchBar({
  searchQuery,
  onSearchChange,
  ownedOnly,
  onOwnedToggle,
}: CardSearchBarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm focus-within:border-[#4B90CD] focus-within:ring-1 focus-within:ring-[#4B90CD]/30 transition-all">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 shrink-0 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="search"
          aria-label="Search players"
          placeholder="Search players..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
        />
        {searchQuery ? (
          <button
            type="button"
            className="shrink-0 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors"
            onClick={() => onSearchChange("")}
          >
            Clear
          </button>
        ) : null}
      </div>

      <label className="flex cursor-pointer items-center gap-3 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-colors hover:bg-gray-50">
        <span className="text-sm font-medium text-gray-700">Owned Only</span>
        <div className="relative">
          <input
            type="checkbox"
            checked={ownedOnly}
            onChange={(e) => onOwnedToggle(e.target.checked)}
            className="peer sr-only"
          />
          <div className="h-6 w-11 rounded-full bg-gray-200 transition-colors peer-checked:bg-[#0f1b2d]" />
          <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
        </div>
      </label>
    </div>
  );
}
