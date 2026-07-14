import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Reusable server-side Pagination component.
 *
 * Props:
 * - pagination: { page, limit, totalRecords, totalPages, hasNextPage, hasPreviousPage }
 * - onPageChange: (page: number) => void
 * - onLimitChange: (limit: number) => void
 * - loading: boolean
 */
const Pagination = ({ pagination, onPageChange, onLimitChange, loading = false }) => {
  if (!pagination || pagination.totalRecords === 0) return null;

  const { page, limit, totalRecords, totalPages, hasNextPage, hasPreviousPage } = pagination;

  const startRecord = (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, totalRecords);

  /**
   * Generate page numbers with smart ellipsis.
   * Always shows first page, last page, and a window around the current page.
   */
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5; // Max page buttons to show (excluding first/last)

    if (totalPages <= 7) {
      // Show all pages if small enough
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always include first page
      pages.push(1);

      const start = Math.max(2, page - Math.floor(maxVisible / 2));
      const end = Math.min(totalPages - 1, start + maxVisible - 1);
      const adjustedStart = Math.max(2, end - maxVisible + 1);

      if (adjustedStart > 2) {
        pages.push('...');
      }

      for (let i = adjustedStart; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('...');
      }

      // Always include last page
      pages.push(totalPages);
    }

    return pages;
  };

  const pageSizes = [10, 25, 50, 100];

  return (
    <div className="px-6 py-4 border-t border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Left: Record count & page size */}
      <div className="flex items-center gap-4 text-xs text-slate-500 font-semibold">
        <span>
          Showing <span className="text-slate-300">{startRecord}</span> to{' '}
          <span className="text-slate-300">{endRecord}</span> of{' '}
          <span className="text-slate-300">{totalRecords}</span> records
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Rows:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            disabled={loading}
            className="appearance-none pl-2 pr-6 py-1 rounded-lg text-xs bg-slate-900/60 border border-slate-800 text-slate-300 focus:border-emerald-500/60 focus:outline-none font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: Page navigation */}
      <div className="flex items-center gap-1">
        {/* First page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={!hasPreviousPage || loading}
          className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-900 hover:text-slate-200 transition-colors cursor-pointer"
          title="First page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPreviousPage || loading}
          className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-900 hover:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((pageNum, idx) =>
          pageNum === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-2 py-1.5 text-xs text-slate-600 font-semibold select-none">
              ···
            </span>
          ) : (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              disabled={loading}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                page === pageNum
                  ? 'bg-emerald-400 border-emerald-400 text-slate-950 shadow-md shadow-emerald-400/10'
                  : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              } disabled:cursor-not-allowed`}
            >
              {pageNum}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage || loading}
          className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-900 hover:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNextPage || loading}
          className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-900 hover:text-slate-200 transition-colors cursor-pointer"
          title="Last page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
