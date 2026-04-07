"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Factor = {
  id: string;
  status: string;
  factor_type?: string;
  friendly_name?: string | null;
};

type Props = {
  requiredByPolicy: boolean;
};

export default function MfaSecurityClient({ requiredByPolicy }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currentLevel, setCurrentLevel] = useState("aal1");
  const [nextLevel, setNextLevel] = useState("aal1");
  const [factors, setFactors] = useState<Factor[]>([]);
  const [setupFactorId, setSetupFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [verifyCode, setVerifyCode] = useState("");

  async function loadStatus() {
    setLoading(true);
    setError("");

    const [aalResult, factorsResult] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);

    if (aalResult.error) {
      setLoading(false);
      setError(aalResult.error.message || "Não foi possível carregar o status de MFA.");
      return;
    }

    if (factorsResult.error) {
      setLoading(false);
      setError(factorsResult.error.message || "Não foi possível carregar os fatores configurados.");
      return;
    }

    setCurrentLevel(aalResult.data.currentLevel);
    setNextLevel(aalResult.data.nextLevel);
    setFactors([...(factorsResult.data.totp ?? []), ...(factorsResult.data.phone ?? [])]);
    setLoading(false);
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function startEnrollment() {
    setEnrolling(true);
    setMessage("");
    setError("");

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
    });

    setEnrolling(false);

    if (enrollError) {
      setError(enrollError.message || "Não foi possível iniciar a configuração do autenticador.");
      return;
    }

    setSetupFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setMessage("Escaneie o QR Code e depois valide o código do app autenticador.");
  }

  async function verifySetup() {
    if (!setupFactorId) {
      setError("Inicie a configuração do autenticador antes de validar o código.");
      return;
    }

    setVerifying(true);
    setMessage("");
    setError("");

    const challenge = await supabase.auth.mfa.challenge({ factorId: setupFactorId });

    if (challenge.error) {
      setVerifying(false);
      setError(challenge.error.message || "Não foi possível iniciar o desafio TOTP.");
      return;
    }

    const verify = await supabase.auth.mfa.verify({
      factorId: setupFactorId,
      challengeId: challenge.data.id,
      code: verifyCode.trim(),
    });

    setVerifying(false);

    if (verify.error) {
      setError(verify.error.message || "Código inválido. Tente novamente.");
      return;
    }

    setVerifyCode("");
    setSetupFactorId("");
    setQrCode("");
    setMessage("Segundo fator configurado com sucesso.");
    await loadStatus();
  }

  async function verifyExistingFactor() {
    const factor = factors.find((item) => item.status === "verified") ?? factors[0];

    if (!factor) {
      setError("Nenhum fator TOTP está configurado para esta conta.");
      return;
    }

    setVerifying(true);
    setMessage("");
    setError("");

    const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });

    if (challenge.error) {
      setVerifying(false);
      setError(challenge.error.message || "Não foi possível solicitar o desafio do segundo fator.");
      return;
    }

    const verify = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.data.id,
      code: verifyCode.trim(),
    });

    setVerifying(false);

    if (verify.error) {
      setError(verify.error.message || "Código do autenticador inválido.");
      return;
    }

    setVerifyCode("");
    setMessage("Sessão validada em nível aal2.");
    await loadStatus();
  }

  async function removeFactor(factorId: string) {
    const confirmed = window.confirm(
      "Remover este fator de autenticação? Você perderá a proteção adicional desta conta.",
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });

    if (unenrollError) {
      setError(unenrollError.message || "Não foi possível remover o fator selecionado.");
      return;
    }

    await supabase.auth.refreshSession();
    setMessage("Fator removido com sucesso.");
    await loadStatus();
  }

  if (loading) {
    return (
      <div className="card-surface rounded-[2rem] px-6 py-10 text-sm text-white/65">
        Carregando configurações de segurança...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card-surface rounded-[2rem] p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">AAL atual</p>
            <p className="mt-2 text-2xl font-semibold">{currentLevel}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Próximo nível</p>
            <p className="mt-2 text-2xl font-semibold">{nextLevel}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Política do workspace</p>
            <p className="mt-2 text-2xl font-semibold">
              {requiredByPolicy ? "2FA obrigatório" : "2FA opcional"}
            </p>
          </div>
        </div>

        {message ? (
          <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card-surface rounded-[2rem] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">Fatores ativos</p>
              <h3 className="mt-2 text-2xl font-semibold">Aplicativos autenticadores</h3>
            </div>

            <button
              type="button"
              onClick={() => void startEnrollment()}
              disabled={enrolling}
              className="h-11 rounded-2xl bg-[linear-gradient(90deg,#38e038_0%,#0465cd_100%)] px-5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enrolling ? "Gerando QR..." : "Configurar novo fator"}
            </button>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/5 text-white/60">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Nome amigável</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {factors.length ? (
                  factors.map((factor) => (
                    <tr key={factor.id} className="border-t border-white/10">
                      <td className="px-4 py-3 font-mono text-xs text-white/75">{factor.id}</td>
                      <td className="px-4 py-3">{factor.friendly_name || "Authenticator app"}</td>
                      <td className="px-4 py-3">{factor.status}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => void removeFactor(factor.id)}
                          className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-200 transition hover:bg-red-400/15"
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-t border-white/10">
                    <td colSpan={4} className="px-4 py-6 text-sm text-white/55">
                      Nenhum fator configurado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-surface rounded-[2rem] p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-white/40">Validação</p>
          <h3 className="mt-2 text-2xl font-semibold">Confirmar código TOTP</h3>

          <p className="mt-3 text-sm leading-6 text-white/65">
            Use esta área para finalizar a configuração de um novo fator ou elevar a sessão
            atual de <strong>{currentLevel}</strong> para <strong>{nextLevel}</strong>.
          </p>

          {qrCode ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white p-4">
              <img
                src={qrCode}
                alt="QR Code para app autenticador"
                className="mx-auto max-h-[260px] w-full max-w-[260px] object-contain"
              />
            </div>
          ) : null}

          <div className="mt-5">
            <label className="mb-2 block text-sm text-white/70">Código do autenticador</label>
            <input
              value={verifyCode}
              onChange={(event) => setVerifyCode(event.target.value.trim())}
              placeholder="000000"
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {setupFactorId ? (
              <button
                type="button"
                onClick={() => void verifySetup()}
                disabled={verifying || !verifyCode}
                className="h-11 rounded-2xl bg-[linear-gradient(90deg,#38e038_0%,#0465cd_100%)] px-5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {verifying ? "Validando..." : "Ativar novo fator"}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => void verifyExistingFactor()}
              disabled={verifying || !verifyCode || !factors.length}
              className="h-11 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {verifying ? "Confirmando..." : "Validar sessão atual"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
