import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth-callback")({
  head: () => ({
    meta: [
      { title: "Entrando na sua conta | Patrimo" },
      {
        name: "description",
        content: "Finalizando o acesso à sua conta Patrimo com segurança.",
      },
      { property: "og:title", content: "Entrando na sua conta | Patrimo" },
      { property: "og:description", content: "Finalizando o acesso à sua conta Patrimo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      navigate({ to: data.session ? "/dashboard" : "/auth", replace: true });
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled || !session) return;
      navigate({ to: "/dashboard", replace: true });
    });

    void resolve();

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Entrando na sua conta...
      </div>
    </main>
  );
}
