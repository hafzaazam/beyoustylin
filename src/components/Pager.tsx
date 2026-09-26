import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// eslint-disable-next-line react-refresh/only-export-components
export const usePaged = <T,>(items: T[], pageSize = 25, resetKey?: unknown) => {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  // Jump back to page 1 when filters change.
  useEffect(() => { setPage(1); }, [resetKey]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  const pageItems = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize]);
  return { page, setPage, pageCount, pageItems, total: items.length, pageSize };
};

interface PagerProps {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  setPage: (p: number) => void;
}

const Pager = ({ page, pageCount, total, pageSize, setPage }: PagerProps) => {
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t text-xs text-muted-foreground">
      <span>{from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="px-2 tabular-nums">{page} / {pageCount}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page >= pageCount} onClick={() => setPage(page + 1)} aria-label="Next page">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default Pager;
