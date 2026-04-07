"use client";

import { createContext, useContext } from "react";

export type AppModule =
  | "geral"
  | "inteligencia_operacional"
  | "excelencia_comercial"
  | "verbas"
  | "plano_midia";

export type AuthzContextValue = {
  role: "owner" | "admin" | "manager" | "analyst" | "viewer";
  permissions: Record<
    AppModule,
    {
      canView: boolean;
      canEdit: boolean;
    }
  >;
};

const AuthzContext = createContext<AuthzContextValue | null>(null);

export function AuthzProvider({
  value,
  children,
}: {
  value: AuthzContextValue;
  children: React.ReactNode;
}) {
  return <AuthzContext.Provider value={value}>{children}</AuthzContext.Provider>;
}

export function useAuthz() {
  const context = useContext(AuthzContext);

  if (!context) {
    throw new Error("useAuthz must be used within an AuthzProvider");
  }

  return context;
}