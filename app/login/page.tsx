import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthProvider } from "@/components/AuthProvider";
import { LoginForm } from "@/components/LoginForm";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in — Brew Base",
};

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <AuthProvider initialUser={null}>
      <LoginForm />
    </AuthProvider>
  );
}
