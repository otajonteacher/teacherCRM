export const STUDENTS_PAGE_SIZE = 50;

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
