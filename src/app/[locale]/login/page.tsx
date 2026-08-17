import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { LoginForm } from "./login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GraduationCap } from "lucide-react";

// Auth (cookies) va next-intl sabab dinamik render
export const dynamic = "force-dynamic";

const demoAccounts = [
  { role: "ADMIN", login: "admin@maktab.uz" },
  { role: "TEACHER", login: "teacher@maktab.uz" },
  { role: "ACCOUNTANT", login: "accountant@maktab.uz" },
  { role: "PARENT", login: "parent@maktab.uz" },
];

export default async function LoginPage() {
  // Allaqachon kirgan bo'lsa — dashboardga
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const t = await getTranslations("login");
  const tr = await getTranslations("roles");

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <GraduationCap className="h-6 w-6" />
          </div>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LoginForm />

          <div className="rounded-md border bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">{t("demoTitle")}</p>
            <ul className="space-y-1">
              {demoAccounts.map((acc) => (
                <li key={acc.login} className="flex justify-between gap-2">
                  <span>{tr(acc.role)}</span>
                  <code className="text-foreground">{acc.login}</code>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
