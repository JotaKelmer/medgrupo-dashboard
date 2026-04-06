"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Funnel_Display } from "next/font/google";
import { createClient } from "@/lib/supabase/client";

const funnelDisplay = Funnel_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

function getSafeNextPath(nextParam: string | null) {
  if (!nextParam) return "/dashboard/geral";
  if (!nextParam.startsWith("/")) return "/dashboard/geral";
  if (nextParam.startsWith("//")) return "/dashboard/geral";
  return nextParam;
}

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const nextPath = useMemo(
    () => getSafeNextPath(searchParams.get("next")),
    [searchParams],
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setLoading(false);
      setError("Não foi possível acessar. Verifique seu e-mail e senha.");
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  return (
    <main
      className={`${funnelDisplay.className} flex min-h-screen items-center justify-center px-4 py-8 text-white sm:px-6`}
    >
      <div className="relative grid w-full max-w-[1120px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl lg:grid-cols-2">
        <span className="absolute left-0 top-0 h-1 w-full bg-[#0465cd]" />
        <span className="absolute bottom-0 left-0 h-1 w-[35%] bg-[linear-gradient(90deg,#38e038_0%,#0465cd_100%)]" />
        <span className="absolute right-0 top-0 hidden h-full w-1 bg-[#0465cd] lg:block" />

        <section className="hidden flex-col justify-between bg-[radial-gradient(circle_at_top_left,_rgba(4,101,205,0.25),_transparent_35%),linear-gradient(180deg,_rgba(5,10,30,0.98),_rgba(4,8,24,0.98))] p-10 lg:flex">
          <div>
            <div className="mb-10 flex h-14 w-44 items-center rounded-xl border border-white/10 px-4">
              <div className="relative h-7 w-full">
                <Image
                  src="/brands/revlabs-logo.png"
                  alt="Logo Rev.Labs"
                  fill
                  className="object-contain object-left"
                  priority
                />
              </div>
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-tight">
              Dados claros para decisões rápidas.
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-white/70">
              Plataforma inteligente para acompanhar mídia, performance e operação com clareza,
              reunindo indicadores, investimentos, funis, criativos e dados em um único painel.
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
              <div className="flex h-14 w-44 items-center rounded-xl border border-white/10 px-4">
                <div className="relative h-7 w-full">
                  <Image
                    src="/brands/revlabs-logo.png"
                    alt="Logo Rev.Labs"
                    fill
                    className="object-contain object-left"
                    priority
                  />
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="mb-4 flex h-14 w-44 items-center rounded-xl border border-white/10 px-4">
                <div className="relative h-7 w-full">
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
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm outline-none transition focus:border-[#0465cd]"
                  required
                  autoComplete="email"
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
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 pr-16 text-sm outline-none transition focus:border-[#0465cd]"
                    required
                    autoComplete="current-password"
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
                className="h-12 w-full rounded-2xl bg-[linear-gradient(90deg,#38e038_0%,#0465cd_100%)] text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
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