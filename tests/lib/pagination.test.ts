import { describe, expect, it } from "vitest";

import {
  clampPage,
  pageCount,
  parsePositivePage,
  STUDENTS_PAGE_SIZE,
} from "@/lib/pagination";

describe("pagination helpers", () => {
  it("uses a bounded page size for the students list", () => {
    expect(STUDENTS_PAGE_SIZE).toBe(50);
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
