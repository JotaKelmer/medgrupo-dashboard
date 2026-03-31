"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Funnel_Display } from "next/font/google";
import { createClient } from "@/lib/supabase/client";

const funnelDisplay = Funnel_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError("Não foi possível acessar. Verifique seu e-mail e senha.");
      return;
    }

    router.replace("/dashboard/geral");
    router.refresh();
  }

  return (
    <main
      className={`${funnelDisplay.className} flex min-h-screen items-center justify-center px-4 py-8 text-white sm:px-6`}
    >
      <div className="grid w-full max-w-[1120px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl lg:grid-cols-2">
        <section className="hidden flex-col justify-between bg-[radial-gradient(circle_at_top_left,_rgba(54,92,255,0.28),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(0,224,255,0.14),_transparent_30%),linear-gradient(180deg,_rgba(8,14,34,0.98),_rgba(4,8,24,0.98))] p-10 lg:flex">
          <div>
            <div className="mb-10 flex h-12 w-44 items-center rounded-xl border border-white/10 px-4">
              <div className="relative h-8 w-full">
                <Image
                  src="/brands/revlabs-logo.png"
                  alt="Logo Rev.Labs"
                  fill
                  className="object-contain object-left"
                  priority
                />
              </div>
            </div>

            <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
              Rev.Labs
            </span>

            <h1 className="mt-6 text-4xl font-semibold leading-tight">
              Inteligência aplicada para acompanhar mídia, performance e operação
              com mais clareza.
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-white/70">
              Acesse a plataforma da Rev.Labs para visualizar indicadores,
              investimento, funis, criativos e dados consolidados em um só lugar.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/50">Visão executiva</p>
              <p className="mt-2 text-lg font-medium">
                Leitura clara dos dados para decisões mais rápidas.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/50">Operação integrada</p>
              <p className="mt-2 text-lg font-medium">
                Marketing, mídia e acompanhamento centralizados.
              </p>
            </div>
          </div>
        </section>

        <section className="p-6 sm:p-10 lg:p-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <div className="flex h-12 w-40 items-center rounded-xl border border-white/10 px-4">
                <div className="relative h-8 w-full">
                  <Image
                    src="/brands/revlabs-logo.png"
                    alt="Logo Rev.Labs"
                    fill
                    className="object-contain object-left"
                    priority
                  />
                </div>
              </div>

              <p className="mt-4 text-sm text-white/50">Rev.Labs</p>
            </div>

            <div className="mb-8">
              <div className="mb-4 flex h-12 w-40 items-center rounded-xl border border-white/10 px-4">
                <div className="relative h-8 w-full">
                  <Image
                    src="/brands/medgrupo-logo.png"
                    alt="Logo Medgrupo"
                    fill
                    className="object-contain object-left"
                    priority
                  />
                </div>
              </div>

              <h2 className="text-3xl font-semibold">Entrar na plataforma</h2>

              <p className="mt-2 text-sm text-white/60">
                Use seu e-mail e senha para acessar o ambiente de acompanhamento
                da operação.
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
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm outline-none transition focus:border-cyan-400/50"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">Senha</label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Digite sua senha"
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 pr-16 text-sm outline-none transition focus:border-cyan-400/50"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/60"
                  >
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-2xl bg-cyan-400/90 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}