import { z } from "zod";

/**
 * REYTING — HISOB-KITOB VA VALIDATSIYA
 * ====================================
 *
 * Jurnal bir kun bilan, Baholar bir kun yoki bir hafta bilan ishlaydi.
 * Reyting esa CHORAK bo'yicha yig'ma ko'rsatkich: kim qanchalik
 * o'zlashtirgani, tartibi va choraklar kesimida o'sishi.
 *
 * Bu fayl faqat MATEMATIKA bilan shug'ullanadi — bazaga ham, sessiyaga ham
 * murojaat qilmaydi. "Bu odam kimning reytingini ko'rishi mumkin?" savoli
 * scope.ts va sahifaning o'zida hal qilinadi.
 *
 * YAKUNIY BALL FORMULASI (egasi bilan kelishilgan)
 * -----------------------------------------------
 *   yakuniy = (baho × bahoUlushi + test × testUlushi) / ulushlarYig'indisi
 *             − jarimaBall × jarimaKoeffitsienti
 *
 * TZ dagi formula so'zma-so'z `baho − jarima + test` edi, lekin u holda ball
 * 100 dan oshib ketardi (bahosi 95, testi 90 bo'lgan bola 113 olardi) va
 * 100 ballik tizimda bu chalkash. Shuning uchun baho va test ULUSH bo'lib
 * qo'shiladi — ma'nosi bir xil, ammo natija doim 0–100 oralig'ida qoladi.
 *
 * TEST HALI YO'Q. Testlar moduli yozilmagani uchun ko'p o'quvchida test
 * natijasi bo'sh bo'ladi. Bo'sh test 0 deb hisoblanmaydi — aks holda butun
 * maktabning balli 20% ga tushib ketardi. Test bo'lmasa baho ulushi 100%
 * bo'ladi va testlar paydo bo'lgach formula o'zi ishlab ketadi.
 */

/** Sozlama jadvalidagi yakka qatorning ID si (singleton). */
export const RANKING_SETTING_ID = "global";

export type RankingSettings = {
  /** Baho ulushi, foizda (0–100). */
  gradeWeight: number;
  /** Test ulushi, foizda (0–100). */
  testWeight: number;
  /** Har bir jarima balli necha yuzdan ball yechadi (50 = 0.50 ball). */
  penaltyFactor: number;
};

/**
 * Standart qiymatlar. Bazada sozlama qatori hali yaratilmagan bo'lsa shular
 * ishlatiladi — sahifa "sozlama yo'q" deb ishdan chiqmasligi kerak.
 */
export const DEFAULT_RANKING_SETTINGS: RankingSettings = {
  gradeWeight: 80,
  testWeight: 20,
  penaltyFactor: 50,
};

// ------------------------------------------------------------------
// Qamrov
// ------------------------------------------------------------------

/**
 * Reyting kimlar orasida tuziladi:
 *   - class    — bitta sinf ichida
 *   - parallel — bir xil bosqichdagi barcha sinflar (masalan barcha 9-sinflar)
 *   - school   — butun maktab
 */
export const RANKING_SCOPES = ["class", "parallel", "school"] as const;

export type RankingScopeValue = (typeof RANKING_SCOPES)[number];

/**
 * `searchParams` ishonchsiz manba — URL ga qo'lda nima yozilgani ma'lum emas.
 * Shuning uchun qamrov qiymati doim shu funksiya orqali tekshiriladi.
 */
export function isRankingScope(value: unknown): value is RankingScopeValue {
  return RANKING_SCOPES.some((scope) => scope === value);
}

// ------------------------------------------------------------------
// Diagramma ranglari
// ------------------------------------------------------------------

/**
 * Diagramma ranglari OLDINDAN belgilangan — hech qachon tasodifiy emas.
 *
 * Sabab: egasining talabi bo'yicha diagrammalar bir-biriga qo'shilib
 * ketmasligi kerak. Tasodifiy rang yoki shaffoflik ishlatilsa, ikki fan
 * bir xil ko'k rangda chiqib qolishi mumkin. Ro'yxatdagi ranglar bir-biridan
 * yaqqol farq qiladi va tartibi doim bir xil, ya'ni Matematika har safar
 * ochilganda bir xil rangda bo'ladi.
 */
export const CHART_COLORS = [
  "#2563eb", // ko'k
  "#059669", // yashil
  "#d97706", // to'q sariq
  "#dc2626", // qizil
  "#7c3aed", // binafsha
  "#0891b2", // moviy
  "#c026d3", // pushti
  "#65a30d", // zaytun
] as const;

/** Fan soni ranglar sonidan oshsa aylanib qaytadi. */
export function colorAt(index: number): string {
  const safe = index < 0 ? 0 : index;
  return CHART_COLORS[safe % CHART_COLORS.length];
}

/** Choraklar uchun qat'iy ranglar: 1-chorak, 2-chorak, 3-chorak, 4-chorak. */
export const QUARTER_COLORS = [
  "#2563eb",
  "#059669",
  "#d97706",
  "#dc2626",
] as const;

export function quarterColor(quarterName: number): string {
  const index = quarterName - 1;
  if (index < 0 || index >= QUARTER_COLORS.length) return "#64748b";
  return QUARTER_COLORS[index];
}

// ------------------------------------------------------------------
// Hisob-kitob
// ------------------------------------------------------------------

/**
 * O'rtacha qiymat, bir kasrli aniqlikda.
 *
 * Bo'sh ro'yxatda `null` qaytadi — 0 deb ko'rsatish yolg'on bo'lardi:
 * "bahosi yomon" emas, "bahosi hali yo'q".
 */
export function averageOf(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((total, value) => total + value, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

function clampScore(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 10) / 10;
}

export type FinalScoreInput = {
  gradeAverage: number | null;
  testAverage: number | null;
  penaltyPoints: number;
};

/**
 * Yakuniy reyting balli.
 *
 * Baho ham, test ham bo'lmasa `null` — bu o'quvchi reytingga umuman
 * kirmaydi (o'rin ham berilmaydi), chunki hech qanday ma'lumot yo'q.
 */
export function finalScore(
  input: FinalScoreInput,
  settings: RankingSettings
): number | null {
  const { gradeAverage, testAverage } = input;
  if (gradeAverage === null && testAverage === null) return null;

  // Mavjud bo'lmagan ko'rsatkichning ulushi hisobga olinmaydi.
  const gradeWeight = gradeAverage === null ? 0 : settings.gradeWeight;
  const testWeight = testAverage === null ? 0 : settings.testWeight;
  const totalWeight = gradeWeight + testWeight;

  // Ikkala ulush ham 0 qilib qo'yilgan bo'lsa bo'lish mumkin emas.
  if (totalWeight <= 0) return null;

  const weighted =
    ((gradeAverage ?? 0) * gradeWeight + (testAverage ?? 0) * testWeight) /
    totalWeight;

  const penalty = (input.penaltyPoints * settings.penaltyFactor) / 100;

  return clampScore(weighted - penalty);
}

export type RankInput = { id: string; score: number | null };

/**
 * O'rin belgilash — KETMA-KET (dense) usulda: 1, 1, 2, 3.
 *
 * Egasining qat'iy talabi: bir xil ball bir xil o'rin oladi, undan keyingi
 * ball esa DARHOL keyingi o'rinni oladi. Ya'ni ikki bola birinchi bo'lsa,
 * uchinchisi 2-o'rinda turadi (3-o'rinda emas). Sport reytinglarida boshqa
 * qoida bor, lekin bu yerda qoidani egasi belgilaydi.
 *
 * Balli `null` bo'lgan o'quvchiga o'rin berilmaydi.
 */
export function rankByScore(rows: RankInput[]): Map<string, number | null> {
  const result = new Map<string, number | null>();

  const scored = rows
    .filter((row): row is { id: string; score: number } => row.score !== null)
    .sort((left, right) => right.score - left.score);

  let rank = 0;
  let previous: number | null = null;

  for (const row of scored) {
    if (previous === null || row.score !== previous) {
      rank += 1;
      previous = row.score;
    }
    result.set(row.id, rank);
  }

  for (const row of rows) {
    if (!result.has(row.id)) result.set(row.id, null);
  }

  return result;
}

/**
 * "Dastlabki N o'rin" maydoni.
 *
 * Bo'sh qoldirilsa `null` — butun ro'yxat ko'rsatiladi. Yuqori chegara 500:
 * URL ga qo'lda katta raqam yozib sahifani cho'ktirishning oldini oladi.
 */
export function parseTopN(raw?: string): number | null {
  if (!raw || raw.trim() === "") return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.trunc(parsed);
  if (rounded < 1) return null;
  return rounded > 500 ? 500 : rounded;
}

/** Diagrammada ko'rsatiladigan ustunlar soni (jadval to'liq qoladi). */
export const CHART_LIMIT_DEFAULT = 10;

// ------------------------------------------------------------------
// Sozlamalarni saqlash sxemasi
// ------------------------------------------------------------------

/**
 * Forma matn yuboradi, shuning uchun `coerce` — lekin chegaralar qat'iy.
 *
 * `penaltyFactor` uchun yuqori chegara 1000 (ya'ni 10 ball): bir jarima
 * balli butun reytingni nolga tushirib yubormasligi kerak. Manfiy qiymat
 * taqiqlangan — aks holda jarima ball MUKOFOTGA aylanib qolardi.
 */
export const rankingSettingsSchema = z.object({
  gradeWeight: z.coerce.number().int().min(0).max(100),
  testWeight: z.coerce.number().int().min(0).max(100),
  penaltyFactor: z.coerce.number().int().min(0).max(1000),
});

export type RankingSettingsInput = z.infer<typeof rankingSettingsSchema>;
