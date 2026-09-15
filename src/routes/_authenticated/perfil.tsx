import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Lock, Mail, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useFinance, useRefreshFinance } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Patrimo" },
      {
        name: "description",
        content: "Gerencie seus dados pessoais e informações da conta.",
      },
      { property: "og:title", content: "Perfil — Patrimo" },
      { property: "og:description", content: "Gerencie seus dados pessoais e informações da conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const { data, isLoading } = useFinance();
  const refresh = useRefreshFinance();

  const [name, setName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!data) return;
    const value = (name ?? data.profile?.full_name ?? "").trim();
    if (!value) {
      toast.error("Informe seu nome.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: value })
      .eq("id", data.userId);
    setSaving(false);

    if (error) {
      toast.error("Não foi possível salvar o perfil.");
      return;
    }
    await refresh();
    toast.success("Perfil atualizado com sucesso.");
  }

  if (isLoading || !data) {
    return (
      <AppShell title="Perfil">
        <Skeleton className="h-48 w-full rounded-xl" />
      </AppShell>
    );
  }

  const profile = data.profile;
  const isGoogle = profile?.email?.endsWith("@gmail.com");

  return (
    <AppShell title="Perfil" description="Seus dados e acesso">
      <div className="grid max-w-xl gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-primary" /> Meus dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                maxLength={100}
                value={name ?? profile?.full_name ?? ""}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" value={profile?.email ?? ""} disabled className="bg-accent/30" />
              {isGoogle ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Mail className="h-3 w-3" /> Vem da sua conta Google e não pode ser alterado.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Lock className="h-3 w-3" /> Vinculado com segurança à sua conta.
                </p>
              )}
            </div>

            <Button onClick={() => void save()} disabled={saving} size="sm">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Login</span>
              <span className="font-semibold text-foreground">
                {isGoogle ? "Google" : "E-mail e senha"}
              </span>
            </div>
            {profile?.created_at && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-muted-foreground">Conta criada em</span>
                <span className="font-semibold text-foreground">
                  {formatDate(profile.created_at.slice(0, 10))}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/privacidade" className="hover:underline">
            Privacidade
          </Link>{" "}
          ·{" "}
          <Link to="/termos" className="hover:underline">
            Termos de Uso
          </Link>
        </p>
      </div>
    </AppShell>
  );
}