"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function getRedirectTo() {
  if (typeof window === "undefined") {
    return "/auth/callback?next=/reset-password";
  }

  return `${window.location.origin}/auth/callback?next=/reset-password`;
}

export default function ForgotPasswordPageClient() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setDone(false);
    setError("");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getRedirectTo(),
    });

    setLoading(false);

    if (resetError) {
      setError(
        resetError.message || "Não foi possível enviar o e-mail de redefinição de senha.",
      );
      return;
    }

    setDone(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 text-white">
      <div className="card-surface w-full max-w-xl rounded-[2rem] p-8 shadow-2xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.24em] text-white/40">Recuperação de acesso</p>
          <h1 className="mt-3 text-3xl font-semibold">Esqueci minha senha</h1>
          <p className="mt-3 text-sm leading-6 text-white/65">
            Informe o e-mail cadastrado. Vamos enviar um link seguro para você definir
            uma nova senha.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-white/70">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seuemail@empresa.com.br"
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm outline-none transition focus:border-[#0465cd]"
              required
              autoComplete="email"
            />
          </div>

          {done ? (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              Se existir uma conta para este e-mail, o link de redefinição já foi enviado.
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
            {loading ? "Enviando..." : "Enviar link de recuperação"}
          </button>
        </form>

        <div className="mt-6">
          <Link href="/login" className="text-sm text-[#7db7ff] transition hover:text-white">
            Voltar para o login
          </Link>
        </div>
      </div>
    </main>
  );
}
