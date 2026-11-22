import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";

export default async function MenuLayout({ children }: { children: ReactNode }) {
  await requireRole("admin", "manager");
  return children;
}
