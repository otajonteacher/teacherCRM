/**
 * BAHOLAR — MA'LUMOT SHAKLI VA HISOB-KITOB (6-bosqich)
 * ====================================================
 *
 * KELISHILGAN QAROR: tizim FAQAT 100 BALLIK, butun son 0–100.
 *
 * BAHO KIRITISHNING YAGONA JOYI — JURNAL (`/journal`).
 * "Baholar" sahifasi (`/grades`) faqat o'qish uchun: unda forma ham,
 * Server Action ham yo'q. Shuning uchun bu faylda ham baho yozish
 * sxemasi saqlanmaydi — jurnalning sxemasi `src/lib/journal.ts` da
 * (`journalSaveSchema`).
 *
 * OLIB TASHLANGAN KOD (PR H5b): ilgari bu yerda oylik jadval uchun
 * alohida kirish sxemasi turardi — `gradeGridSaveSchema`, uning
 * `toGridInput` preprocess'i, `cellKey`, `ENTRY_PREFIX`,
 * `MAX_GRID_ENTRIES`, `MONTH_TEXT_PATTERN`, `DATE_TEXT_PATTERN` va oy/sana
 * yordamchilari (`dateToText`, `todayText`, `monthOf`, `todayMonth`,
 * `dayOfWeekFromText`, `monthDatesForWeekdays`). Ular "oylik baho jadvali"
 * ko'rinishidan qolgan edi; u ko'rinish jurnalga almashtirilgandan keyin
 * hech qaysi fayl ularni chaqirmay qo'ygan.
 *
 * NIMA UCHUN O'CHIRILDI (xavfsizlik nuqtai nazaridan):
 * ishlatilmaydigan kirish sxemasi — bu "tirik" hujum yuzasi emas, lekin
 * xavfli yo'ldosh. Keyinchalik kimdir shu sxemani ko'rib "demak baho
 * jadval orqali ham saqlanadi" deb yangi Server Action yozib qo'yishi
 * mumkin edi — u esa `gradingLessonScope` tekshiruvidan o'tmagan,
 * ya'ni baho qo'yish huquqi bo'lmagan odam ham yozadigan ikkinchi yo'l
 * paydo bo'lardi. Bitta yozish yo'li = bitta tekshiriladigan joy.
 * Bundan tashqari o'lik kod har bir auditda qayta o'qilishi kerak
 * bo'lgan ortiqcha yuk bo'lib turardi.
 *
 * MA'LUMOT MODELI (davomatdan FARQ QILADI):
 *
 *   Attendance -> lessonId ga bog'langan, @@unique([studentId, lessonId, date])
 *   Grade      -> @@unique([studentId, lessonId, date, type])
 *
 * `Grade` da cheklov bor, lekin u `lessonId` ni ham o'z ichiga oladi.
 * `lessonId` esa `null` bo'lishi mumkin, PostgreSQL da unique cheklovida
 * `NULL` qiymatlar bir-biriga TENG hisoblanmaydi. Ya'ni `lessonId: null`
 * bo'lgan qatorlar cheklovdan chetda qoladi va takrorlanishi mumkin —
 * shuning uchun cheklovga tayanib bo'lmaydi.
 *
 * Shu sababli idempotentlik ilova qatlamida ta'minlanadi: server (fan +
 * chorak + sana + tur + o'quvchi) bo'yicha mavjud bahoni O'ZI topadi.
 * Klientdan baho ID si OLINMAYDI.
 *
 * `lessonId: null` qatorlarini tozalash va cheklovni kuchaytirish —
 * 1-to'lqin, PR F3 (migratsiya va backfill talab qiladi).
 *
 * "Bu odam shu fanga baho qo'yishi mumkinmi?" savoli bu faylda EMAS —
 * u `scope.ts` (`assertCanGradeClassSubject`) mas'uliyatida.
 */

/** Baho turlari — Prisma'dagi `GradeType` enum bilan bir xil tartibda. */
export const GRADE_TYPES = ["DAILY", "CONTROL", "EXAM"] as const;

export type GradeTypeValue = (typeof GRADE_TYPES)[number];

/** 100 ballik tizim chegaralari. */
export const GRADE_MIN = 0;
export const GRADE_MAX = 100;

/**
 * Berilgan matn haqiqiy baho turimi? (`as const` tuple'da .includes ishlamaydi)
 *
 * `searchParams.type` ishonchsiz manba: jurnal va baholar sahifalari shu
 * tekshiruvdan o'tmagan qiymatni ishlatmaydi, noma'lum tur jimgina
 * `DAILY` ga tushadi.
 */
export function isGradeType(value: unknown): value is GradeTypeValue {
  return GRADE_TYPES.some((type) => type === value);
}

// ------------------------------------------------------------------
// Hisob-kitob
// ------------------------------------------------------------------

/**
 * O'rtacha ball — YAGONA MANBA `./scoring` da.
 *
 * Ilgari bu funksiya shu faylda VA `ranking.ts` da bayt-bayt bir xil qilib
 * ikki marta yozilgan edi. Ikki nusxa bir xil bo'lsa ham xavfli: yumaloqlash
 * qoidasi birida o'zgartirilsa, baholar sahifasi bilan reyting sahifasi
 * bir xil o'quvchi uchun boshqa o'rtacha ball ko'rsatishi mumkin edi.
 *
 * Bu yerda `export ... from` qilinadi, ya'ni `@/lib/grades` dan import
 * qilayotgan mavjud kod o'zgarmaydi.
 */
export { averageOf } from "./scoring";

/**
 * 100 ballik bahoning daraja nomi (tarjima kaliti).
 *
 * Faqat KO'RSATISH uchun hisoblanadi — bazada saqlanmaydi. Shunda
 * chegaralarni keyin o'zgartirsa, eski yozuvlarni qayta hisoblash kerak
 * bo'lmaydi.
 */
export function gradeLevelKey(
  value: number
): "excellent" | "good" | "average" | "weak" {
  if (value >= 86) return "excellent";
  if (value >= 71) return "good";
  if (value >= 56) return "average";
  return "weak";
}

// ------------------------------------------------------------------
// Ko'rsatish yordamchisi
// ------------------------------------------------------------------

/**
 * "2026-08-21" → "21.08" (jadval sarlavhasi uchun qisqa ko'rinish).
 *
 * Sana hisob-kitobining o'zi (hafta boshi, hafta kunlari, kun raqami)
 * `./attendance` da — baholar sahifasi ham shu yagona manbadan oladi.
 */
export function shortDateLabel(dateText: string): string {
  return `${dateText.slice(8, 10)}.${dateText.slice(5, 7)}`;
}
