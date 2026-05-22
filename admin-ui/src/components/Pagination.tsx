import { vi } from '../lib/vi';

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, pageSize, total, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const from = total === 0 ? 0 : safePage * pageSize + 1;
  const to = Math.min((safePage + 1) * pageSize, total);

  if (total <= pageSize) {
    return total > 0 ? (
      <p className="pagination-summary">{vi.pagination.summaryAll(total)}</p>
    ) : null;
  }

  return (
    <nav className="pagination" aria-label={vi.pagination.aria}>
      <p className="pagination-summary">
        {vi.pagination.summaryRange(from, to, total)}
      </p>
      <div className="pagination-controls">
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          disabled={safePage <= 0}
          onClick={() => onPageChange(safePage - 1)}
        >
          {vi.pagination.prev}
        </button>
        <span className="pagination-page">
          {vi.pagination.pageOf(safePage + 1, totalPages)}
        </span>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          disabled={safePage >= totalPages - 1}
          onClick={() => onPageChange(safePage + 1)}
        >
          {vi.pagination.next}
        </button>
      </div>
    </nav>
  );
}
