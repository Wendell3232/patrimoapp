import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { redeemLicense } from "@/lib/licenses";
import { CHECKOUT_URL, PRICE_LABEL } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/ativar")({
  head: () => ({
    meta: [
      { title: "Ativar licença — Patrimo" },
      {
        name: "description",
        content: "Ative sua licença do Patrimo com o código recebido na compra.",
      },
      { property: "og:title", content: "Ativar licença — Patrimo" },
      { property: "og:description", content: "Ative sua licença do Patrimo com o código recebido na compra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Ativar,
});

function Ativar() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (loading) return;
    setLoading(true);

    const result = await redeemLicense(code);
    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? "Não foi possível ativar a licença.");
      return;
    }

    toast.success("Licença ativada com sucesso!");
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
                <KeyRound className="h-5 w-5 text-primary" />
              </span>
              <div>
                <h1 className="font-display text-lg font-semibold leading-tight">
                  Ativar acesso
                </h1>
                <p className="text-sm text-muted-foreground">
                  Cole aqui o código que você recebeu após a compra.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="code">Código de licença</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX-XXXX"
                  autoCapitalize="characters"
                  autoComplete="off"
                  className="font-mono tracking-wider"
                  aria-invalid={Boolean(error)}
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={loading || !code.trim()}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ativar minha licença
              </Button>
            </form>

            {CHECKOUT_URL.startsWith("http") && (
              <p className="text-center text-sm text-muted-foreground">
                Ainda não comprou?{" "}
                <a
                  href={CHECKOUT_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  Comprar por {PRICE_LABEL}
                </a>
              </p>
            )}

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