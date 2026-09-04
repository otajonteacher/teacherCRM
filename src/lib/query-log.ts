import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * SO'ROV LOGI — VAQTINCHALIK O'LCHOV VOSITASI (0-to'lqin, 0.2)
 * ===========================================================
 *
 * Maqsad: qaysi sahifa nechta so'rov yuboradi va har biri qancha vaqt oladi —
 * taxmin emas, dalil. 2-to'lqin (tezlik) ishlari SHU raqamlarga qarab
 * tanlanadi.
 *
 * Ishlatilishi (faqat lokal):
 *   QUERY_LOG=1 npm run dev
 *
 * MUHIM: log faqat `QUERY_LOG=1` bo'lganda va `NODE_ENV !== production` da
 * yoqiladi. Ishlab chiqarishda hech qachon ishlamaydi — chunki:
 *   1. SQL matni logga tushishi baza strukturasini oshkor qiladi;
 *   2. har so'rovga qo'shimcha yozuv sekinlashtiradi.
 *
 * PARAMETRLAR: `params` ichida parol hash'i, email, o'quvchi ismi bo'lishi
 * mumkin. Shuning uchun ular **sukut bo'yicha chiqarilmaydi**. Kerak bo'lsa
 * ataylab yoqiladi: `QUERY_LOG_PARAMS=1`.
 *
 * O'lchov tugagach bu fayl va `db.ts` dagi chaqiruv olib tashlanadi.
 */

type AttachOptions = {
  /** Shu qiymatdan uzoq so'rov "SEKIN" deb belgilanadi (ms). */
  slowMs: number;
  /** SQL parametrlarini ham chiqarish (maxfiy ma'lumot bo'lishi mumkin). */
  withParams: boolean;
};

type TableStat = { count: number; totalMs: number; maxMs: number };

/** Jadval kesimida jami hisob — xulosa chiqarish uchun. */
const stats = new Map<string, TableStat>();

let queryCount = 0;
let totalMs = 0;

/** Har 25 so'rovdan keyin qisqa xulosa chiqaramiz. */
const SUMMARY_EVERY = 25;

/**
 * SQL matnidan jadval nomini ajratib oladi.
 * Masalan: `SELECT ... FROM "public"."Student" WHERE ...` → `Student`.
 */
function tableOf(query: string): string {
  const match = query.match(
    /(?:from|into|update|join)\s+(?:"[^"]+"\.)?"([^"]+)"/i
  );
  return match?.[1] ?? "?";
}

/** SQL matnidan amal turini oladi: SELECT / INSERT / UPDATE / DELETE. */
function actionOf(query: string): string {
  return query.trim().split(/\s+/, 1)[0]?.toUpperCase() ?? "?";
}

/** Uzun SQL ni bir qatorga siqib, kesib qo'yadi. */
function shorten(query: string, limit = 160): string {
  const oneLine = query.replace(/\s+/g, " ").trim();
  return oneLine.length > limit ? `${oneLine.slice(0, limit)}…` : oneLine;
}

function record(table: string, durationMs: number): void {
  const current = stats.get(table) ?? { count: 0, totalMs: 0, maxMs: 0 };
  current.count += 1;
  current.totalMs += durationMs;
  current.maxMs = Math.max(current.maxMs, durationMs);
  stats.set(table, current);
}

/** Jadval kesimidagi xulosa — eng ko'p vaqt yeganlar yuqorida. */
function printSummary(): void {
  const rows = Array.from(stats.entries())
    .map(([table, stat]) => ({ table, ...stat }))
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, 10);

  console.log(
    `\n[so'rov-xulosa] jami ${queryCount} so'rov, ${totalMs.toFixed(0)}ms`
  );
  for (const row of rows) {
    console.log(
      `  ${row.table.padEnd(18)} ${String(row.count).padStart(4)} ta  ` +
        `jami ${row.totalMs.toFixed(0).padStart(6)}ms  ` +
        `eng uzun ${row.maxMs.toFixed(0).padStart(5)}ms`
    );
  }
  console.log("");
}

/**
 * Prisma klientiga `query` hodisasi tinglovchisini ulaydi.
 * Klient `log: [{ emit: "event", level: "query" }]` bilan yaratilgan bo'lishi shart.
 */
export function attachQueryLog(
  client: PrismaClient,
  options: AttachOptions
): void {
  // IKKINCHI QATLAM QULF (fail-closed).
  //
  // Hozir chaqiruv joyi (`db.ts`) `NODE_ENV !== "production"` shartini
  // tekshiradi. Lekin bu shart kelajakda o'zgartirilib yoki tasodifan olib
  // tashlanib qo'yilsa, ishlab chiqarish logiga SQL matnlari (jadval va ustun
  // nomlari, `QUERY_LOG_PARAMS=1` bo'lsa qiymatlar ham) tushib ketardi.
  //
  // Xavfsizlik qulfi bitta joyga suyanmasligi kerak — shuning uchun vosita
  // o'zi ham ishlab chiqarishda ishlashdan bosh tortadi.
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[so'rov] log ishlab chiqarishda o'chirilgan — yoqish so'rovi rad etildi."
    );
    return;
  }

  const emitter = client as unknown as {
    $on: (
      event: "query",
      callback: (payload: Prisma.QueryEvent) => void
    ) => void;
  };

  emitter.$on("query", (event) => {
    const durationMs = event.duration;
    const table = tableOf(event.query);

    queryCount += 1;
    totalMs += durationMs;
    record(table, durationMs);

    const slow = durationMs >= options.slowMs;
    const marker = slow ? "SEKIN" : "     ";

    console.log(
      `[so'rov] #${String(queryCount).padStart(4)} ` +
        `${durationMs.toFixed(0).padStart(5)}ms ${marker} ` +
        `${actionOf(event.query).padEnd(6)} ${table.padEnd(18)} ` +
        shorten(event.query)
    );

    if (options.withParams) {
      console.log(`         parametrlar: ${event.params}`);
    }

    if (queryCount % SUMMARY_EVERY === 0) printSummary();
  });

  console.log(
    `[so'rov] log yoqildi — sekin chegarasi ${options.slowMs}ms` +
      (options.withParams ? ", parametrlar ko'rsatiladi" : "")
  );
}
