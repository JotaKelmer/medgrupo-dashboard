import MfaSecurityClient from "./mfa-security-client";
import { requireAppContext } from "@/lib/auth/guards";

export default async function SecurityPage() {
  const context = await requireAppContext();

  return (
    <section className="space-y-6">
      <div className="card-surface rounded-[2rem] px-6 py-6">
        <p className="text-xs uppercase tracking-[0.24em] text-white/40">Segurança</p>
        <h2 className="mt-3 text-3xl font-semibold">Autenticação em dois fatores</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">
          Configure TOTP com aplicativo autenticador para aumentar a segurança da conta
          <strong> {context.user.email}</strong>.
        </p>
      </div>

      <MfaSecurityClient requiredByPolicy={context.workspaceMember.mfa_required} />
    </section>
  );
}