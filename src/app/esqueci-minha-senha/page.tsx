import type { Metadata } from "next";
import ForgotPasswordPageClient from "./forgot-password-page-client";

export const metadata: Metadata = {
  title: "Esqueci minha senha",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageClient />;
}
