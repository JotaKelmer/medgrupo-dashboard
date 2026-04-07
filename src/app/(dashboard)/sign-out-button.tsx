"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white/75 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
    >
      Sair
    </button>
  );
}
