interface CardPaginationProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export default function CardPagination({
  totalPages,
  currentPage,
  onPageChange,
}: CardPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-center gap-3 py-8" aria-label="Pagination">
      <button
        type="button"
        className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Previous
      </button>

      <span className="flex items-center gap-1 px-3 text-sm text-gray-500">
        Page
        <span className="font-bold text-[#0f1b2d]">{currentPage}</span>
        of
        <span className="font-bold text-[#0f1b2d]">{totalPages}</span>
      </span>

      <button
        type="button"
        className="rounded-xl bg-[#0f1b2d] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1a2d47] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </button>
    </nav>
  );
}
