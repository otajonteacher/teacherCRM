export const PAGE_SIZES = [20, 30, 40, 50] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 30;

// Backward-compatible aliases for the students pagination implementation.
export const STUDENT_PAGE_SIZES = PAGE_SIZES;
export type StudentPageSize = PageSize;
export const DEFAULT_STUDENT_PAGE_SIZE: StudentPageSize = DEFAULT_PAGE_SIZE;

export function parsePageSize(value: string | undefined): PageSize {
  const parsed = Number(value);
  return PAGE_SIZES.includes(parsed as PageSize)
    ? (parsed as PageSize)
    : DEFAULT_PAGE_SIZE;
}

export function parsePositivePage(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function pageCount(totalItems: number, pageSize: number): number {
  if (!Number.isSafeInteger(totalItems) || totalItems <= 0) return 1;
  if (!Number.isSafeInteger(pageSize) || pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function clampPage(page: number, totalPages: number): number {
  const safeTotalPages = Math.max(1, totalPages);
  return Math.min(Math.max(1, page), safeTotalPages);
}
