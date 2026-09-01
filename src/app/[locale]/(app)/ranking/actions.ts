"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createAction, formDataToObject } from "@/lib/safe-action";
import { type SaveResult } from "@/lib/academics";
import { RANKING_SETTING_ID, rankingSettingsSchema } from "@/lib/ranking";

/**
 * REYTING FORMULASI SOZLAMALARINI SAQLASH
 * =======================================
 *
 * Bu sahifada YAGONA yozish amali shu — reyting sahifasi qolgan hamma narsa
 * uchun faqat ko'rish uchun. Baho jurnalda qo'yiladi, jarima ball o'z
 * bo'limida, test o'z modulida. Reyting hech narsa yaratmaydi, faqat
 * hisoblaydi.
 *
 * XAVFSIZLIK:
 *   1. `roles: ["ADMIN"]` — formulani faqat administrator o'zgartiradi.
 *      O'qituvchi o'z fanining ulushini oshirib qo'yishi mumkin bo'lmasligi
 *      kerak, aks holda reyting adolatsiz bo'lardi.
 *   2. zod — chegaralar (0–100, jarima uchun 0–1000) SERVERDA tekshiriladi;
 *      formadagi `min`/`max` faqat qulaylik uchun.
 *   3. audit — administrator ham hisob berishi kerak: kim, qachon, qaysi
 *      qiymatga o'zgartirgani `AuditLog` da qoladi.
 *
 * DIQQAT: bu faylda `"use server"` bor, ya'ni har bir `export` — tashqaridan
 * chaqirilishi mumkin bo'lgan endpoint. Shuning uchun bu yerda yordamchi
 * funksiya eksport qilinmaydi; sxema va konstantalar `src/lib/ranking.ts` da.
 */

export type RankingSettingsFormState = { error?: string; saved?: boolean };

const saveRankingSettingsAction = createAction({
  roles: ["ADMIN"],
  schema: rankingSettingsSchema,
  handler: async (input, user): Promise<SaveResult> => {
    // Ikkala ulush ham 0 bo'lsa formula bo'lishga qolmaydi (0 ga bo'lish).
    if (input.gradeWeight + input.testWeight === 0) {
      return {
        ok: false,
        message: "Baho va test ulushi bir vaqtda 0 bo'lishi mumkin emas.",
      };
    }

    // Jadvalda faqat bitta qator bo'ladi, shuning uchun `upsert`.
    await db.rankingSetting.upsert({
      where: { id: RANKING_SETTING_ID },
      create: {
        id: RANKING_SETTING_ID,
        gradeWeight: input.gradeWeight,
        testWeight: input.testWeight,
        penaltyFactor: input.penaltyFactor,
        updatedById: user.id ?? null,
      },
      update: {
        gradeWeight: input.gradeWeight,
        testWeight: input.testWeight,
        penaltyFactor: input.penaltyFactor,
        updatedById: user.id ?? null,
      },
    });

    // Locale prefiksisiz — konvensiya bo'yicha.
    revalidatePath("/ranking");

    return { ok: true, id: RANKING_SETTING_ID };
  },
  audit: {
    action: "UPDATE",
    entity: "RankingSetting",
    entityId: () => RANKING_SETTING_ID,
    meta: (input) => ({
      gradeWeight: input.gradeWeight,
      testWeight: input.testWeight,
      penaltyFactor: input.penaltyFactor,
    }),
  },
});

export async function saveRankingSettings(
  _prev: RankingSettingsFormState,
  formData: FormData
): Promise<RankingSettingsFormState> {
  const result = await saveRankingSettingsAction(formDataToObject(formData));

  if (!result.ok) return { error: result.error };
  if (!result.data.ok) return { error: result.data.message };

  // Bu yerda `redirect` ishlatilmaydi: administrator filtrni yo'qotmasligi
  // kerak — sozlama saqlangach ayni shu jadval qayta hisoblanadi.
  return { saved: true };
}
