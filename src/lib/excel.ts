import * as XLSX from "xlsx";

/**
 * EXCEL QATLAMI (import/eksport)
 * ==============================
 * Bu modul faqat Excel faylini o'qish va yozish bilan shug'ullanadi.
 * Biznes-qoidalar (validatsiya, dublikat, baza) bu yerda YO'Q — ular
 * `imports.ts` va import action'larida.
 *
 * Xavfsizlik: fayl faqat server tomonda o'qiladi va diskda saqlanmaydi.
 */

/** Bir faylda ruxsat etilgan maksimal qator soni (sarlavhadan tashqari). */
export const MAX_IMPORT_ROWS = 1000;

/** Maksimal fayl hajmi — 5 MB. */
export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;

/** Ruxsat etilgan kengaytmalar — hozircha faqat Excel. */
export const ALLOWED_IMPORT_EXTENSIONS = [".xlsx", ".xls"] as const;

export type SheetRow = {
  /** Excel'dagi haqiqiy qator raqami (1 = sarlavha), foydalanuvchiga ko'rsatiladi. */
  rowNumber: number;
  /** Normallashtirilgan ustun kaliti -> matn qiymati. */
  values: Record<string, string>;
};

export type ParsedSheet = {
  headers: string[];
  keys: string[];
  rows: SheetRow[];
};

/**
 * Ustun sarlavhasini kalitga aylantiradi: registr, bo'sh joy, nuqta, tire,
 * apostroflar e'tiborsiz. Shu tufayli "Vasiy F.I.Sh." va "vasiy fish" bir xil.
 */
export function normalizeKey(value: string): string {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/['’ʻ`]/g, "")
    .replace(/[\s._\-/()\[\]]+/g, "");
}

/** Hujayra qiymatini bir xil matnga keltiradi (sana → YYYY-MM-DD). */
function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(value).trim();
}

export function isAllowedExcelFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ALLOWED_IMPORT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Excel faylining BIRINCHI varag'ini o'qiydi.
 * Bo'sh qatorlar tashlab ketiladi, qiymatlar matn sifatida qaytadi.
 */
export function parseExcel(buffer: ArrayBuffer): ParsedSheet {
  const workbook = XLSX.read(new Uint8Array(buffer), {
    type: "array",
    cellDates: true,
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [], keys: [], rows: [] };

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { headers: [], keys: [], rows: [] };

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });

  const headerRow = matrix[0];
  if (!headerRow) return { headers: [], keys: [], rows: [] };

  const headers = headerRow.map((cell) => cellToString(cell));
  const keys = headers.map((header) => normalizeKey(header));

  const rows: SheetRow[] = [];

  for (let index = 1; index < matrix.length; index += 1) {
    const cells = matrix[index] ?? [];
    const values: Record<string, string> = {};
    let hasValue = false;

    keys.forEach((key, position) => {
      if (!key) return;
      const text = cellToString(cells[position]);
      if (text !== "") hasValue = true;
      // Takroriy sarlavha bo'lsa birinchi to'lgan qiymat saqlanadi.
      if (!values[key] || values[key] === "") values[key] = text;
    });

    if (!hasValue) continue;
    rows.push({ rowNumber: index + 1, values });
  }

  return { headers, keys, rows };
}

/** Matritsadan `.xlsx` fayl yasaydi (shablon va eksport uchun). */
export function buildExcel(rows: (string | number)[][], sheetName: string): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet(rows);

  // Ustun kengligini sarlavha uzunligiga qarab beramiz — fayl o'qishga qulay bo'ladi.
  const header = rows[0] ?? [];
  sheet["!cols"] = header.map((cell) => ({
    wch: Math.min(Math.max(String(cell).length + 4, 12), 40),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31));

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
