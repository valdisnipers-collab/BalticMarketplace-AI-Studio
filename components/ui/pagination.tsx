// Minimal pagination control for admin tables. Renders prev/next + a
// compact page indicator. Total pages optional — callers can pass null
// when they only know current page and whether more exists.

import { Button } from './button';

interface PaginationProps {
  page: number;
  pageSize: number;
  total?: number | null;
  hasMore?: boolean;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, hasMore, onPageChange }: PaginationProps) {
  const totalPages = total != null ? Math.max(1, Math.ceil(total / pageSize)) : null;
  const canPrev = page > 0;
  const canNext = totalPages != null ? page < totalPages - 1 : !!hasMore;

  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm text-slate-600">
      <div>
        {total != null ? (
          <>Lapa {page + 1} no {totalPages} ({total} ieraksti)</>
        ) : (
          <>Lapa {page + 1}</>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
        >
          Iepriekšējā
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
        >
          Nākamā
        </Button>
      </div>
    </div>
  );
}
