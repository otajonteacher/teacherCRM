# Ishlab chiqish qoidalari

Bu hujjat — kod yozishda **majburiy** qoidalar to'plami. Qoida buzilgan modul
qabul qilinmaydi. Sababi oddiy: xavfsizlik qorovullari keyin qo'shilsa, ularni
15 ta modulga tarqatish kerak bo'ladi.

---

## 1. Ikki qatlamli himoya — ikkisi ham majburiy

Har bir himoyalangan sahifa va har bir Server Action **ikkita** savolga javob
berishi kerak:

| Savol | Kim javob beradi | Fayl |
|---|---|---|
| Bu odam qaysi **rolda**? | `requireRole` | `src/lib/auth-guard.ts` |
| U qaysi **qatorlarni** ko'radi? | `studentScope` va h.k. | `src/lib/scope.ts` |

Faqat birinchisi — yetarli emas. `requireRole("TEACHER")` o'tgan o'qituvchi,
doira bo'lmasa, butun maktabning ma'lumotini ko'radi.

```ts
// TO'G'RI
const user = await requireTeaching();
const students = await db.student.findMany({
  where: { AND: [{ status: "ACTIVE" }, studentScope(user)] },
});
```

```ts
// XATO — rol tekshirilgan, lekin doira yo'q
const user = await requireTeaching();
const students = await db.student.findMany({ where: { status: "ACTIVE" } });
```

## 2. Oltin qoida: yolg'iz `findUnique` yo'q

`findUnique({ where: { id } })` — IDOR teshigi. URL'dagi ID ni o'zgartirish
kifoya. Doim ikkisidan biri ishlatiladi:

```ts
// Ro'yxat uchun — doira bilan
where: { AND: [filtr, studentScope(user)] }

// Bitta yozuv uchun — tekshiruv bilan
await assertCanAccessStudent(user, params.id);
```

`assertCanAccess*` funksiyalari doiradan tashqaridagi yozuv uchun `/forbidden`
ga yo'naltiradi va kod bajarilishini to'xtatadi.

## 3. "Topilmadi" va "ruxsat yo'q" — bir xil javob

Ikkisi ham `/forbidden` beradi. Bu **ataylab**: aks holda hujumchi javoblarni
taqqoslab qaysi ID lar bazada mavjudligini aniqlab oladi (enumeration).

## 4. Fail-closed

Rol notanish, ID yo'q yoki holat kutilmagan bo'lsa — ruxsat **kengaymaydi,
torayadi**. `scope.ts` da bu `MATCH_NOTHING` bilan ta'minlangan.

## 5. Klientdan kelgan ma'lumotga ishonilmaydi

- Har bir Server Action **`createAction` / `createFormAction`** (`src/lib/safe-action.ts`)
  orqali yoziladi — istisno yo'q. Wrapper: rol → zod → handler → audit.
- Qo'lda `"use server"` funksiya yozib `requireRole` ni unutish — qabul qilinmaydi.
- Jarima ball **mezondan serverda** olinadi, klientdan emas
- Test to'g'ri javoblari klientga **yuborilmaydi**, baholash serverda
- Test yechish vaqti (`durationSec`) serverda hisoblanadi

## 6. Xato xabarlari

Foydalanuvchiga texnik detal chiqmaydi: stack trace, SQL, Prisma xato kodi yo'q.
Prisma xatolari (`P2002` va h.k.) tarjima qilingan xabarga aylantiriladi
(`prismaErrorMessage` — `safe-action.ts`).

## 7. Rollar va ruxsat

Ruxsat **faqat rol bo'yicha** — har bir foydalanuvchiga alohida ruxsat berish
tizimi yo'q va rejalashtirilmagan. Sahifa darajasidagi ruxsat
`src/lib/rbac.ts` dagi `roleAllowedPaths` da.

**Muhim:** `roleAllowedPaths` va `src/components/nav-config.ts` dagi `navByRole`
**mos bo'lishi shart**. Menyuda havola bor, ro'yxatda yo'q bo'lsa — foydalanuvchi
o'z menyusidagi havolani bosib 403 oladi.

ADMIN `isPathAllowed()` ichida qisqa tutashuv bilan barcha sahifalarga kiradi —
yangi sahifa qo'shilib ro'yxat yangilanmasa ham bloklanmaydi.

## 8. Audit jurnali

Har bir muhim amal `logAudit` orqali `AuditLog` ga yoziladi (kim, nima, qachon).

- `LOGIN` / `LOGOUT` / `LOGIN_FAILED` — `src/auth.ts` events / authorize
- `CREATE` / `UPDATE` / `DELETE` — `createAction` ning `audit` maydoni
- `meta` ga **parol, token, to'liq PII yozilmaydi** — faqat o'zgargan maydon nomlari
- Jurnal xatosi asosiy amalni **to'xtatmaydi**

## 9. Pul amallari

- `$transaction` — invoice status va payment birga o'zgaradi
- To'lov **o'chirilmaydi**, faqat bekor qilinadi (reversal yozuvi)
- Idempotentlik: bir to'lov ikki marta yozilmasligi

## 10. Sxema o'zgarishlari

Sxema o'zgarishi doim **migratsiya** bilan (`prisma migrate dev`), `db:push`
faqat tez prototip uchun. Migratsiyalar git'ga commit qilinadi.

## 11. Git ish uslubi

Har bir o'zgarish alohida branch va PR orqali ketadi. Merge tugmasini loyiha
egasi bosadi. To'g'ridan-to'g'ri ishchi branchga push qilinmaydi.

---

To'liq xavfsizlik ro'yxati va bajarilish tartibi — Notion'dagi
"Xavfsizlik auditi va ishlar ro'yxati" hujjatida.
