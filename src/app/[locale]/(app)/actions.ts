"use server";

import { signOut } from "@/auth";

/** Tizimdan chiqish va login sahifasiga yo'naltirish. */
export async function logout() {
  await signOut({ redirectTo: "/login" });
}
