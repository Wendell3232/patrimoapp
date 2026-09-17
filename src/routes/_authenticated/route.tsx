import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const GATE_TTL = 30_000;

type Gate = {
  at: number;
  user: { id: string; email?: string | null };
  onboarding: boolean;
};

let gateCache: Gate | null = null;

async function loadGate(): Promise<Gate | null> {
  const now = Date.now();
  if (gateCache && now - gateCache.at < GATE_TTL) return gateCache;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const user = data.user;

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  gateCache = {
    at: now,
    user: { id: user.id, email: user.email },
    onboarding: profile ? profile.onboarding_completed : true,
  };
  return gateCache;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const gate = await loadGate();
    if (!gate) throw redirect({ to: "/auth" });

    if (!gate.onboarding) {
      throw redirect({ to: "/onboarding" });
    }

    return { user: gate.user };
  },
  component: () => <Outlet />,
});
