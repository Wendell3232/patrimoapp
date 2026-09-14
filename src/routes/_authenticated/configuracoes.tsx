import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Database, Laptop, Moon, Plus, Sun, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme, type ThemePreference } from "@/components/app/ThemeProvider";
import { supabase } from "@/integrations/supabase/client";
import { useFinance, useRefreshFinance } from "@/lib/data";
import type { Category, CategoryKind } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Patrimo" },
      { name: "description", content: "Categorias e preferências da sua organização financeira." },
      { property: "og:title", content: "Configurações — Patrimo" },
      { property: "og:description", content: "Categorias e preferências da sua organização financeira." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Configuracoes,
});

function Configuracoes() {
  const { data, isLoading } = useFinance();
  const refresh = useRefreshFinance();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CategoryKind>("despesa");
  const [removing, setRemoving] = useState<Category | null>(null);
  const [demo, setDemo] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const { theme, setTheme } = useTheme();

  const themeOptions: { value: ThemePreference; label: string; description: string; icon: typeof Sun }[] = [
    { value: "light", label: "Claro", description: "Fundo claro e contraste suave", icon: Sun },
    { value: "dark", label: "Escuro", description: "Confortável em ambientes escuros", icon: Moon },
    { value: "system", label: "Automático", description: "Segue a preferência do dispositivo", icon: Laptop },
  ];

  async function loadDemo() {
    if (!data) return;
    setLoadingDemo(true);
    const { error } = await supabase.rpc("bootstrap_user_data", {
      p_full_name: data.profile?.full_name ?? "",
      ...(data.profile?.email ? { p_email: data.profile.email } : {}),
    });
    setLoadingDemo(false);
    setDemo(false);
    if (error) {
      toast.error("Não foi possível carregar o exemplo.");
      return;
    }
    await refresh();
    toast.success("Exemplo carregado. Explore as telas com esses números.");
  }

  async function create() {
    if (!data) return;
    if (!name.trim()) {
      toast.error("Informe o nome da categoria.");
      return;
    }
    const { error } = await supabase.from("categories").insert({
      user_id: data.userId,
      name: name.trim(),
      kind,
    });
    if (error) {
      toast.error("Não foi possível criar a categoria.");
      return;
    }
    await refresh();
    setName("");
    toast.success("Categoria criada.");
  }

  async function remove() {
    if (!removing) return;
    const { error } = await supabase.from("categories").delete().eq("id", removing.id);
    if (error) {
      toast.error("Não foi possível remover a categoria.");
      return;
    }
    await refresh();
    setRemoving(null);
    toast.success("Categoria removida.");
  }

  if (isLoading || !data) {
    return (
      <AppShell title="Configurações">
        <Skeleton className="h-48 w-full rounded-xl" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Configurações" description="Aparência, categorias e dados do aplicativo">
      <div className="grid max-w-3xl gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aparência</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {themeOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="outline"
                  onClick={() => setTheme(option.value)}
                  className={theme === option.value ? "h-auto justify-start border-primary bg-accent p-4" : "h-auto justify-start p-4"}
                >
                  <option.icon className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 text-left">
                    <span className="block text-sm font-semibold text-foreground">{option.label}</span>
                    <span className="mt-0.5 block whitespace-normal text-xs font-normal text-muted-foreground">{option.description}</span>
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nova categoria</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="cat-nome">Nome</Label>
              <Input
                id="cat-nome"
                maxLength={40}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={kind} onValueChange={(value) => setKind(value as CategoryKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => void create()}>
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar
            </Button>
          </CardContent>
        </Card>

        {(["receita", "despesa"] as CategoryKind[]).map((group) => (
          <Card key={group}>
            <CardHeader>
              <CardTitle className="text-base">
                {group === "receita" ? "Categorias de receita" : "Categorias de despesa"}
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {data.categories
                .filter((category) => category.kind === group)
                .map((category) => (
                  <div key={category.id} className="flex items-center gap-3 px-4 py-3">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="flex-1 text-sm">{category.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remover categoria"
                      onClick={() => setRemoving(category)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados de exemplo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Carrega contas, cartões, lançamentos, metas e orçamentos fictícios para você conhecer
              todas as telas. Só funciona enquanto você ainda não tiver nenhuma conta cadastrada.
            </p>
            <Button
              variant="outline"
              disabled={loadingDemo || data.accounts.length > 0}
              onClick={() => setDemo(true)}
            >
              <Database className="mr-1.5 h-4 w-4" />
              Carregar exemplo
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={Boolean(removing)} onOpenChange={(value) => !value && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover a categoria {removing?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Os lançamentos já feitos continuam, mas ficam sem categoria e desaparecem dos gráficos
              por categoria. Qualquer limite de gasto ligado a ela também é apagado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={demo} onOpenChange={setDemo}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Carregar dados de exemplo?</AlertDialogTitle>
            <AlertDialogDescription>
              Serão criados números fictícios dos últimos seis meses para você explorar o app. Você
              pode apagar depois manualmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void loadDemo()}>Carregar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
