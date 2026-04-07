import UsersManagementClient from "./users-management-client";
import { requireAdminAccess } from "@/lib/auth/guards";

export default async function UsersPage() {
  await requireAdminAccess();

  return (
    <section className="space-y-6">
      <div className="card-surface rounded-[2rem] px-6 py-6">
        <p className="text-xs uppercase tracking-[0.24em] text-white/40">
          Administração
        </p>
        <h2 className="mt-3 text-3xl font-semibold">Tela de usuários</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">
          Gerencie membros, convites, níveis de permissão por módulo, exigência de 2FA
          e redefinição de senha.
        </p>
      </div>

      <UsersManagementClient />
    </section>
  );
}