"use client";

/**
 * Root layout buzilganda. next-intl bu yerda yo'q — matn hardcode.
 * error.message / stack foydalanuvchiga chiqmaydi.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="uz">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 24, margin: 0 }}>Xatolik yuz berdi</h1>
        <p style={{ color: "#666", maxWidth: 420, margin: 0 }}>
          Kutilmagan xato. Qayta urinib ko&apos;ring yoki administrator bilan
          bog&apos;laning.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #ccc",
            background: "#111",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Qayta urinish
        </button>
      </body>
    </html>
  );
}
