import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDev = process.env.NODE_ENV !== "production";

/**
 * SECURITY HEADERS (Punkt 8)
 *
 * `unsafe-eval` faqat `next dev` da — Next.js HMR shuni talab qiladi.
 * HSTS faqat prod: localhost HTTP da brauzerni buzmaslik uchun.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

if (!isDev) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /*
   * `X-Powered-By: Next.js` sarlavhasini o'chiradi.
   *
   * Next.js uni sukut bo'yicha HAR BIR javobga qo'shadi. Bu funksional
   * jihatdan foydasiz, lekin hujumchiga bepul ma'lumot beradi: qaysi
   * freymvork ishlayotgani. Undan keyin `/_next/static/chunks/...` orqali
   * versiyani aniqlab, o'sha versiyaga tegishli ma'lum zaifliklar
   * ro'yxatini sinab ko'rish mumkin.
   *
   * Bu "himoya" emas, hujum yuzasini kichraytirish: skanerlash bosqichini
   * qiyinlashtiradi. Boshqa xavfsizlik sarlavhalari yuqorida.
   */
  poweredByHeader: false,

  experimental: {
    /*
     * Excel import Server Action orqali fayl yuboradi. Next.js standart
     * chegarasi 1 MB — undan katta fayl kodimizga yetib ham bormay xato
     * beradi. `src/lib/excel.ts` da chegara 5 MB, shuning uchun bu yerda
     * ozgina zaxira bilan 6 MB qo'yamiz (multipart qo'shimchalari uchun).
     */
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
