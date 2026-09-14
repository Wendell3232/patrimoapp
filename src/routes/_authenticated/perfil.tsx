import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calendar,
  CheckCircle2,
  FileText,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        content: "Dados da sua conta, método de acesso, privacidade e termos de uso.",
      },
      { property: "og:title", content: "Perfil — Patrimo" },
      {
        property: "og:description",
        content: "Dados da sua conta, método de acesso, privacidade e termos de uso.",
      },
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
  const isGoogle = profile?.email?.endsWith("@gmail.com"); // Ou detecção de provider

  return (
    <AppShell
      title="Perfil"
      description="Gerencie seus dados pessoais, método de acesso e privacidade"
    >
      <div className="grid max-w-2xl gap-6">
        {/* DADOS PESSOAIS */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Dados cadastrais</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                Conta ativa
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Mantenha seu nome atualizado para personalizar seus relatórios e saudações.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome completo</Label>
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
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                <Lock className="h-3 w-3" />
                Seu e-mail é vinculado com segurança à sua conta de acesso.
              </p>
            </div>

            <Button onClick={() => void save()} disabled={saving} size="sm">
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </CardContent>
        </Card>

        {/* INFORMAÇÕES DA CONTA & ACESSO */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Segurança e acesso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Método de login</span>
              <span className="font-semibold text-foreground">
                {isGoogle ? "Conectado com Google" : "E-mail e senha segura"}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Status da conta</span>
              <span className="font-semibold text-positive flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Verificada
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground">Privacidade dos dados</span>
              <Link to="/configuracoes" className="text-primary hover:underline font-medium">
                Gerenciar dados e backups
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* LINKS LEGAIS E TERMOS */}
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" /> Documentos legais e privacidade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <p className="text-muted-foreground">
                Consulte nossas diretrizes de privacidade e termos de serviço a qualquer momento.
              </p>
              <div className="flex items-center gap-3 shrink-0">
                <Link to="/privacidade" className="text-primary hover:underline font-medium">
                  Política de Privacidade
                </Link>
                <span>•</span>
                <Link to="/termos" className="text-primary hover:underline font-medium">
                  Termos de Uso
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
