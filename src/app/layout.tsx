import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Medgrupo Dashboard",
  description: "Dashboard de mídia e performance do Medgrupo",
};

export default function RootLayout({
  children,
}: {
  children: any;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}