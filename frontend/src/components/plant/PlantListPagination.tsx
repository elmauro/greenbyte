import { PLANT_PAGE_SIZES, type PlantPageSize } from '../../hooks/useListPagination';

type PlantListPaginationProps = {
  page: number;
  pageSize: PlantPageSize;
  totalPages: number;
  from: number;
  to: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PlantPageSize) => void;
  labels: {
    rowsPerPage: string;
    showing: string;
    prev: string;
    next: string;
    pageOf: string;
  };
};

export function PlantListPagination({
  page,
  pageSize,
  totalPages,
  from,
  to,
  total,
  onPageChange,
  onPageSizeChange,
  labels,
}: PlantListPaginationProps) {
  if (total === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-gray-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-gray-600">
        {labels.showing
          .replace('{from}', String(from))
          .replace('{to}', String(to))
          .replace('{total}', String(total))}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <span>{labels.rowsPerPage}</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value) as PlantPageSize)}
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-800"
          >
            {PLANT_PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-gray-500">
          {labels.pageOf.replace('{page}', String(page)).replace('{totalPages}', String(totalPages))}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            {labels.prev}
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            {labels.next}
          </button>
        </div>
      </div>
    </div>
  );
}
