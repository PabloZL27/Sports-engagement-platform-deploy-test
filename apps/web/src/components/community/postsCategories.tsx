export const COMMUNITY_CATEGORIES = [
  "All Topics",
  "Game Day",
  "Team Talk",
  "Cards",
  "Draft",
  "Tailgate & Events",
] as const;

interface PostCategoriesProps {
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

const PostCategories = ({ activeCategory, onSelectCategory }: PostCategoriesProps) => {
  return (
    <>
      {/* Mobile: dropdown */}
      <section className="w-full min-w-0 lg:hidden">
        <label
          htmlFor="community-topic-select"
          className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-[#0B2A55] sm:text-sm"
        >
          Topic
        </label>
        <select
          id="community-topic-select"
          value={activeCategory}
          onChange={(e) => onSelectCategory(e.target.value)}
          className="w-full max-w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#0B2A55] shadow-sm outline-none transition focus:border-[#4B90CD] focus:ring-1 focus:ring-[#4B90CD]/30"
        >
          {COMMUNITY_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </section>

      {/* Desktop: sidebar list */}
      <section className="hidden rounded-2xl p-6 lg:block">
        <h3 className="mb-3 pl-1 text-lg font-semibold uppercase tracking-[0.08em] text-[#0B2A55]">
          Categories
        </h3>
        <ul className="space-y-1">
          {COMMUNITY_CATEGORIES.map((category) => {
            const isActive = activeCategory === category;

            return (
              <li key={category}>
                <button
                  type="button"
                  onClick={() => onSelectCategory(category)}
                  className={`w-full px-4 py-2 text-left text-sm transition-all duration-200 ${
                    isActive
                      ? "rounded-r-xl border-l-4 border-[#0B2A55] bg-[#EFF4FB] font-bold text-[#0B2A55]"
                      : "rounded-xl border-l-4 border-transparent text-[#64748B] hover:bg-[#F8FAFC]"
                  }`}
                >
                  {category}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
};

export default PostCategories;
