import { Suspense } from "react";
import type { Metadata } from "next";
import LoginPageClient from "./login-page-client";

export const metadata: Metadata = {
  title: "Login | Medgrupo Dashboard",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageClient />
    </Suspense>
  );
}