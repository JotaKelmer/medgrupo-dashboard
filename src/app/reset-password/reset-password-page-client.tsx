"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_AFTER_LOGIN_PATH } from "@/lib/auth/constants";

export default function ResetPasswordPageClient() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== passwordConfirm) {
      setError("As senhas digitadas não conferem.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message || "Não foi possível redefinir a senha.");
      return;
    }

    setDone(true);

    window.setTimeout(() => {
      router.replace(DEFAULT_AFTER_LOGIN_PATH);
      router.refresh();
    }, 1200);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 text-white">
      <div className="card-surface w-full max-w-xl rounded-[2rem] p-8 shadow-2xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.24em] text-white/40">Segurança</p>
          <h1 className="mt-3 text-3xl font-semibold">Definir nova senha</h1>
          <p className="mt-3 text-sm leading-6 text-white/65">
            Crie uma senha forte para concluir a recuperação de acesso.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-white/70">Nova senha</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo de 8 caracteres"
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm outline-none transition focus:border-[#0465cd]"
              required
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/70">Confirmar nova senha</label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              placeholder="Repita a nova senha"
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm outline-none transition focus:border-[#0465cd]"
              required
              autoComplete="new-password"
            />
          </div>

          {done ? (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              Senha atualizada com sucesso. Redirecionando para o dashboard...
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-2xl bg-[linear-gradient(90deg,#38e038_0%,#0465cd_100%)] text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      </div>
    </main>
  );
}
