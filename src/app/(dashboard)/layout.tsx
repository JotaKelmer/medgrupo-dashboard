import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Medgrupo Dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: any;
}) {
  return <>{children}</>;
}