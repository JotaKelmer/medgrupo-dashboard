import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Medgrupo Dashboard",
    template: "%s | Medgrupo Dashboard",
  },
  description: "Dashboard de mídia, performance, usuários e permissões do Medgrupo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
