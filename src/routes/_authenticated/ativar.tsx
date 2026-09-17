import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { CHECKOUT_URL, PRICE_LABEL } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/ativar")({
  head: () => ({
    meta: [
      { title: "Acesso ao Patrimo" },
      {
        name: "description",
        content: "Uma assinatura por e-mail: ao comprar, seu acesso é liberado automaticamente.",
      },
      { property: "og:title", content: "Acesso ao Patrimo" },
      {
        property: "og:description",
        content: "Uma assinatura por e-mail: ao comprar, seu acesso é liberado automaticamente.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Acesso,
});

function Acesso() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleCheckAccess() {
    if (loading) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    toast.success("Acesso verificado!");
    navigate({ to: "/dashboard", replace: true });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md">
        <p className="font-display text-lg font-semibold tracking-tight">Patrimo</p>

        <Card className="mt-4">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </span>
              <div>
                <h1 className="font-display text-lg font-semibold leading-tight">
                  Seu acesso ao Patrimo
                </h1>
                <p className="text-sm text-muted-foreground">
                  A licença é vinculada ao e-mail da compra — sem código para ativar.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Ao assinar, seu acesso é liberado automaticamente na conta que usar o{" "}
                <strong className="text-foreground">mesmo e-mail da compra</strong>.
              </p>
              <p>Se você ainda não tem licença por aqui, o próximo passo é assinar.</p>
            </div>

            <div className="space-y-2">
              {CHECKOUT_URL.startsWith("http") && (
                <a href={CHECKOUT_URL} target="_blank" rel="noreferrer" className="block">
                  <Button className="w-full">Assinar por {PRICE_LABEL}</Button>
                </a>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => void handleCheckAccess()}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Já assinei — verificar meu acesso
              </Button>
            </div>

            <button
              onClick={() => void handleLogout()}
              className="mx-auto flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair e trocar de conta
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
