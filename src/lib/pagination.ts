export const STUDENT_PAGE_SIZES = [20, 30, 40, 50] as const;
export type StudentPageSize = (typeof STUDENT_PAGE_SIZES)[number];
export const DEFAULT_STUDENT_PAGE_SIZE: StudentPageSize = 30;

export function parsePageSize(value: string | undefined): StudentPageSize {
  const parsed = Number(value);
  return STUDENT_PAGE_SIZES.includes(parsed as StudentPageSize)
    ? (parsed as StudentPageSize)
    : DEFAULT_STUDENT_PAGE_SIZE;
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
