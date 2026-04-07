import type { Metadata } from "next";
import ResetPasswordPageClient from "./reset-password-page-client";

export const metadata: Metadata = {
  title: "Redefinir senha",
};

export default function ResetPasswordPage() {
  return <ResetPasswordPageClient />;
}
