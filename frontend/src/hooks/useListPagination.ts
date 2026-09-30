export const PLANT_PAGE_SIZES = [10, 20, 50] as const;
export type PlantPageSize = (typeof PLANT_PAGE_SIZES)[number];

export function useListPagination<T>(items: T[], page: number, pageSize: PlantPageSize) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pageItems = items.slice(startIndex, startIndex + pageSize);
  const endIndex = Math.min(startIndex + pageSize, total);

  return {
    pageItems,
    total,
    totalPages,
    safePage,
    startIndex,
    endIndex,
    from: total === 0 ? 0 : startIndex + 1,
    to: endIndex,
  };
}
