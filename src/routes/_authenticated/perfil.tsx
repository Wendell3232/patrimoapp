import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useFinance, useRefreshFinance } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Patrimo" },
      { name: "description", content: "Seus dados pessoais e preferências de conta." },
      { property: "og:title", content: "Perfil — Patrimo" },
      { property: "og:description", content: "Seus dados pessoais e preferências de conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
      toast.error("Não foi possível salvar.");
      return;
    }
    await refresh();
    toast.success("Perfil atualizado.");
  }


  if (isLoading || !data) {
    return (
      <AppShell title="Perfil">
        <Skeleton className="h-48 w-full rounded-xl" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Perfil" description="Seus dados">
      <div className="grid max-w-3xl gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                maxLength={100}
                value={name ?? data.profile?.full_name ?? ""}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" value={data.profile?.email ?? ""} disabled />
            </div>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </CardContent>
        </Card>

      </div>
    </AppShell>
  );
}
