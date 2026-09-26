import { describe, expect, it } from "vitest";

import {
  clampPage,
  DEFAULT_STUDENT_PAGE_SIZE,
  pageCount,
  parsePageSize,
  parsePositivePage,
  STUDENT_PAGE_SIZES,
} from "@/lib/pagination";

describe("pagination helpers", () => {
  it("allows only the approved students page sizes", () => {
    expect(STUDENT_PAGE_SIZES).toEqual([20, 30, 40, 50]);
    expect(DEFAULT_STUDENT_PAGE_SIZE).toBe(30);
    expect(parsePageSize("20")).toBe(20);
    expect(parsePageSize("30")).toBe(30);
    expect(parsePageSize("40")).toBe(40);
    expect(parsePageSize("50")).toBe(50);
    expect(parsePageSize("25")).toBe(DEFAULT_STUDENT_PAGE_SIZE);
    expect(parsePageSize("1000")).toBe(DEFAULT_STUDENT_PAGE_SIZE);
  });

  it("parses only positive safe integer pages", () => {
    expect(parsePositivePage(undefined)).toBe(1);
    expect(parsePositivePage("0")).toBe(1);
    expect(parsePositivePage("-2")).toBe(1);
    expect(parsePositivePage("2.5")).toBe(1);
    expect(parsePositivePage("3")).toBe(3);
  });

  it("calculates at least one page", () => {
    expect(pageCount(0, 50)).toBe(1);
    expect(pageCount(27, 50)).toBe(1);
    expect(pageCount(1000, 50)).toBe(20);
  });

  it("clamps an out-of-range page", () => {
    expect(clampPage(0, 20)).toBe(1);
    expect(clampPage(3, 20)).toBe(3);
    expect(clampPage(99, 20)).toBe(20);
  });
});
