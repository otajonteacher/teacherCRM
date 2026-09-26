import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales } from "./config";

type Messages = { [key: string]: string | Messages };

function isGroup(value: unknown): value is Messages {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeMessages(sources: Messages[]): Messages {
  const result: Messages = {};

  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      const current = result[key];
      result[key] =
        isGroup(current) && isGroup(value) ? { ...current, ...value } : value;
    }
  }

  return result;
}

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as (typeof locales)[number])) notFound();

  const [base, attendance, grades, journal, ranking, pagination] =
    await Promise.all([
      import(`../../messages/${locale}.json`),
      import(`../../messages/attendance/${locale}.json`),
      import(`../../messages/grades/${locale}.json`),
      import(`../../messages/journal/${locale}.json`),
      import(`../../messages/ranking/${locale}.json`),
      import(`../../messages/pagination/${locale}.json`),
    ]);

  return {
    messages: mergeMessages([
      base.default,
      attendance.default,
      grades.default,
      journal.default,
      ranking.default,
      pagination.default,
    ]),
  };
});
