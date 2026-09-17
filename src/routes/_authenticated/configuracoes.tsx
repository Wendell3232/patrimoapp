import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  Database,
  Download,
  Edit2,
  FolderOpen,
  Laptop,
  Moon,
  Pencil,
  Plus,
  Settings,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme, type ThemePreference } from "@/components/app/ThemeProvider";
import { supabase } from "@/integrations/supabase/client";
import { useFinance, useRefreshFinance } from "@/lib/data";
import type { Category, CategoryKind } from "@/lib/finance";
import { toISODate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Patrimo" },
      {
        name: "description",
        content:
          "Gerencie categorias, alertas inteligentes, preferências visuais e dados com segurança.",
      },
      { property: "og:title", content: "Configurações — Patrimo" },
      {
        property: "og:description",
        content:
          "Gerencie categorias, alertas inteligentes, preferências visuais e dados com segurança.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Configuracoes,
});

function Configuracoes() {
  const { data, isLoading } = useFinance();
  const refresh = useRefreshFinance();
  const { theme, setTheme } = useTheme();

  // Aba ativa
  const [activeTab, setActiveTab] = useState("categorias");

  // Criação de categoria
  const [openCreateCat, setOpenCreateCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatKind, setNewCatKind] = useState<CategoryKind>("despesa");
  const [createCatError, setCreateCatError] = useState<string | null>(null);

  // Edição de categoria
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatKind, setEditCatKind] = useState<CategoryKind>("despesa");

  // Remoção de categoria com proteção de movimentações
  const [removingCat, setRemovingCat] = useState<Category | null>(null);
  const [reassignCatId, setReassignCatId] = useState<string>("");

  // Preferências e alertas locais (armazenados em localStorage)
  const [alertInvoiceDays, setAlertInvoiceDays] = useState(() => {
    return localStorage.getItem("patrimo_alert_invoice_days") ?? "3";
  });
  const [alertBudgetPct, setAlertBudgetPct] = useState(() => {
    return localStorage.getItem("patrimo_alert_budget_pct") ?? "80";
  });
  const [alertLowBalance, setAlertLowBalance] = useState(() => {
    return localStorage.getItem("patrimo_alert_low_balance") ?? "300";
  });

  const [dateFormat, setDateFormat] = useState("DD/MM/AAAA");
  const [startDayOfMonth, setStartDayOfMonth] = useState("1");
  const [demoLoading, setDemoLoading] = useState(false);
  const [dangerConfirmText, setDangerConfirmText] = useState("");

  const themeOptions: {
    value: ThemePreference;
    label: string;
    description: string;
    icon: typeof Sun;
  }[] = [
    { value: "light", label: "Claro", description: "Fundo claro e contraste suave", icon: Sun },
    { value: "dark", label: "Escuro", description: "Confortável para a visão à noite", icon: Moon },
    {
      value: "system",
      label: "Automático",
      description: "Segue a preferência do dispositivo",
      icon: Laptop,
    },
  ];

  function saveAlertSettings() {
    localStorage.setItem("patrimo_alert_invoice_days", alertInvoiceDays);
    localStorage.setItem("patrimo_alert_budget_pct", alertBudgetPct);
    localStorage.setItem("patrimo_alert_low_balance", alertLowBalance);
    toast.success("Preferências de alertas salvas com sucesso!");
  }

  async function createCategory() {
    if (!data) return;
    if (!newCatName.trim()) {
      setCreateCatError("Informe o nome da categoria.");
      return;
    }
    const { error } = await supabase.from("categories").insert({
      user_id: data.userId,
      name: newCatName.trim(),
      kind: newCatKind,
    });
    if (error) {
      setCreateCatError("Não foi possível criar a categoria.");
      return;
    }
    await refresh();
    toast.success("Categoria criada com sucesso.");
    setNewCatName("");
    setCreateCatError(null);
    setOpenCreateCat(false);
  }

  async function saveEditCategory() {
    if (!editingCat) return;
    if (!editCatName.trim()) {
      toast.error("Informe o nome da categoria.");
      return;
    }
    const { error } = await supabase
      .from("categories")
      .update({ name: editCatName.trim(), kind: editCatKind })
      .eq("id", editingCat.id);
    if (error) {
      toast.error("Não foi possível atualizar a categoria.");
      return;
    }
    await refresh();
    toast.success("Categoria atualizada.");
    setEditingCat(null);
  }

  async function confirmRemoveCategory() {
    if (!removingCat || !data) return;
    const txCount = data.transactions.filter((t) => t.category_id === removingCat.id).length;

    // Se houver movimentações, exige reatribuição antes de deletar
    if (txCount > 0) {
      if (!reassignCatId) {
        toast.error("Escolha a nova categoria para onde as movimentações serão transferidas.");
        return;
      }
      const { error: moveError } = await supabase
        .from("transactions")
        .update({ category_id: reassignCatId })
        .eq("category_id", removingCat.id);

      if (moveError) {
        toast.error("Não foi possível transferir as movimentações.");
        return;
      }
    }

    const { error } = await supabase.from("categories").delete().eq("id", removingCat.id);
    if (error) {
      toast.error("Não foi possível remover a categoria.");
      return;
    }

    await refresh();
    toast.success(
      txCount > 0
        ? `Categoria removida e ${txCount} movimentações foram transferidas com sucesso.`
        : "Categoria removida.",
    );
    setRemovingCat(null);
    setReassignCatId("");
  }

  async function loadDemo() {
    if (!data) return;
    setDemoLoading(true);
    const { error } = await supabase.rpc("bootstrap_user_data", {
      p_full_name: data.profile?.full_name ?? "",
      ...(data.profile?.email ? { p_email: data.profile.email } : {}),
    });
    setDemoLoading(false);
    if (error) {
      toast.error("Não foi possível carregar os dados de demonstração.");
      return;
    }
    await refresh();
    toast.success("Dados de exemplo carregados com sucesso!");
  }

  function exportJSON() {
    if (!data) return;
    const exportObject = {
      exportDate: new Date().toISOString(),
      profile: data.profile,
      accounts: data.accounts,
      cards: data.cards,
      categories: data.categories,
      budgets: data.budgets,
      goals: data.goals,
      commitments: data.commitments,
      transactions: data.transactions,
    };
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObject, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `patrimo-backup-${toISODate(new Date())}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    toast.success("Backup completo em JSON baixado com sucesso!");
  }

  if (isLoading || !data) {
    return (
      <AppShell title="Configurações">
        <Skeleton className="h-64 w-full rounded-xl" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Configurações">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto sm:inline-flex sm:w-auto sm:justify-center">
          <TabsTrigger value="categorias" className="shrink-0">
            Categorias
          </TabsTrigger>
          <TabsTrigger value="alertas" className="shrink-0">
            Alertas
          </TabsTrigger>
          <TabsTrigger value="preferencias" className="shrink-0">
            Preferências
          </TabsTrigger>
          <TabsTrigger value="dados" className="shrink-0">
            Dados e Privacidade
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: CATEGORIAS */}
        <TabsContent value="categorias" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Categorias cadastradas</CardTitle>
                <CardDescription className="text-xs">
                  Crie, edite ou mescle suas categorias. Categorias em uso não são apagadas sem
                  destino seguro.
                </CardDescription>
              </div>
              <Dialog open={openCreateCat} onOpenChange={setOpenCreateCat}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-1.5 h-4 w-4" /> Nova categoria
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Criar nova categoria</DialogTitle>
                    <DialogDescription>
                      Categorias ajudam você e o Agente Financeiro a entender para onde vai o seu
                      dinheiro.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="cat-name">Nome</Label>
                      <Input
                        id="cat-name"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="Ex: Farmácia, Pet, Assinaturas"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Tipo</Label>
                      <Select
                        value={newCatKind}
                        onValueChange={(v) => setNewCatKind(v as CategoryKind)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="despesa">Saída / Despesa</SelectItem>
                          <SelectItem value="receita">Entrada / Receita</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {createCatError && (
                      <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                        {createCatError}
                      </p>
                    )}
                  </div>

                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={() => setOpenCreateCat(false)}>
                      Cancelar
                    </Button>
                    <Button type="button" onClick={() => void createCategory()}>
                      Salvar categoria
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>

            <CardContent>
              <div className="divide-y divide-border">
                {data.categories.map((cat) => {
                  const txCount = data.transactions.filter((t) => t.category_id === cat.id).length;

                  return (
                    <div key={cat.id} className="flex items-center justify-between py-3 text-sm">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <div>
                          <span className="font-semibold text-foreground">{cat.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({txCount} {txCount === 1 ? "movimentação" : "movimentações"})
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {cat.kind === "despesa" ? "Despesa" : "Receita"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Editar categoria"
                          onClick={() => {
                            setEditingCat(cat);
                            setEditCatName(cat.name);
                            setEditCatKind(cat.kind);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Remover categoria"
                          onClick={() => {
                            setRemovingCat(cat);
                            setReassignCatId("");
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 2: ALERTAS */}
        <TabsContent value="alertas" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" /> Prazos e preferências de alertas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="space-y-1.5">
                <Label htmlFor="alert-invoice" className="text-sm font-medium">
                  Avisar antes do vencimento da fatura do cartão
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="alert-invoice"
                    type="number"
                    min={1}
                    max={15}
                    value={alertInvoiceDays}
                    onChange={(e) => setAlertInvoiceDays(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">dias de antecedência</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="alert-budget" className="text-sm font-medium">
                  Avisar quando o orçamento de uma categoria atingir
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="alert-budget"
                    type="number"
                    min={50}
                    max={100}
                    value={alertBudgetPct}
                    onChange={(e) => setAlertBudgetPct(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">% do limite mensal</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="alert-balance" className="text-sm font-medium">
                  Avisar quando o saldo projetado ficar abaixo de
                </Label>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">R$</span>
                  <Input
                    id="alert-balance"
                    type="number"
                    value={alertLowBalance}
                    onChange={(e) => setAlertLowBalance(e.target.value)}
                    className="w-32"
                  />
                </div>
              </div>

              <Button type="button" onClick={saveAlertSettings} className="mt-2">
                Salvar preferências de alertas
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 3: PREFERÊNCIAS */}
        <TabsContent value="preferencias" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Aparência do aplicativo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {themeOptions.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant="outline"
                    onClick={() => setTheme(opt.value)}
                    className={
                      theme === opt.value
                        ? "h-auto justify-start border-primary bg-primary/5 p-4 text-left"
                        : "h-auto justify-start p-4 text-left"
                    }
                  >
                    <opt.icon className="h-5 w-5 shrink-0 text-primary mr-3" />
                    <div>
                      <span className="block text-sm font-semibold text-foreground">
                        {opt.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">{opt.description}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Formato e ciclo mensal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="space-y-1.5">
                <Label className="text-xs">Formato de data</Label>
                <Select value={dateFormat} onValueChange={setDateFormat}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/AAAA">DD/MM/AAAA (Padrão Brasil)</SelectItem>
                    <SelectItem value="AAAA-MM-DD">AAAA-MM-DD (ISO)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Moeda padrão</Label>
                <Input value="Real Brasileiro (BRL - R$)" disabled className="w-64 bg-accent/30" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Início do ciclo financeiro</Label>
                <Select value={startDayOfMonth} onValueChange={setStartDayOfMonth}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Dia 1º de cada mês</SelectItem>
                    <SelectItem value="5">Dia 5 de cada mês</SelectItem>
                    <SelectItem value="10">Dia 10 de cada mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 4: DADOS E PRIVACIDADE */}
        <TabsContent value="dados" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-positive" /> Seus dados são privados e seguros
              </CardTitle>
              <CardDescription className="text-xs">
                O Patrimo não vende, não compartilha e não utiliza seus dados para publicidade. Suas
                finanças pertencem exclusivamente a você.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="sm" onClick={exportJSON}>
                  <Download className="mr-1.5 h-4 w-4" /> Exportar backup completo (JSON)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadDemo()}
                  disabled={demoLoading}
                >
                  <Database className="mr-1.5 h-4 w-4" />
                  {demoLoading ? "Carregando..." : "Carregar dados de demonstração"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Área de Perigo Protegida */}
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Zona de segurança
              </CardTitle>
              <CardDescription className="text-xs">
                Ações irreversíveis relacionadas à sua conta e registros.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <p>
                Para solicitar a exclusão definitiva de todos os seus dados e encerramento da conta,
                entre em contato através da tela de suporte ou utilize o botão abaixo com
                confirmação estrita.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL DE EDIÇÃO DE CATEGORIA */}
      <Dialog open={editingCat !== null} onOpenChange={(o) => !o && setEditingCat(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar categoria</DialogTitle>
            <DialogDescription>Ajuste o nome ou o tipo desta categoria.</DialogDescription>
          </DialogHeader>

          {editingCat && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-cat-name">Nome da categoria</Label>
                <Input
                  id="edit-cat-name"
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={editCatKind}
                  onValueChange={(v) => setEditCatKind(v as CategoryKind)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="despesa">Saída / Despesa</SelectItem>
                    <SelectItem value="receita">Entrada / Receita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setEditingCat(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void saveEditCategory()}>
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE REMOÇÃO DE CATEGORIA COM REATRIBUIÇÃO OBRIGATÓRIA */}
      <AlertDialog open={removingCat !== null} onOpenChange={(o) => !o && setRemovingCat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Remover categoria "{removingCat?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-3 text-xs">
              {removingCat &&
                (() => {
                  const count = data.transactions.filter(
                    (t) => t.category_id === removingCat.id,
                  ).length;
                  const availableCats = data.categories.filter(
                    (c) => c.id !== removingCat.id && c.kind === removingCat.kind,
                  );

                  if (count > 0) {
                    return (
                      <div className="space-y-3">
                        <p className="font-semibold text-amber-700 dark:text-amber-400">
                          A categoria "{removingCat.name}" está vinculada a {count}{" "}
                          {count === 1 ? "movimentação" : "movimentações"}.
                        </p>
                        <p>
                          Para não deixar seus lançamentos órfãos, escolha para qual categoria elas
                          devem ser movidas antes de remover:
                        </p>
                        <div className="pt-1">
                          <Label className="text-xs">Mover movimentações para:</Label>
                          <Select value={reassignCatId} onValueChange={setReassignCatId}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Escolha a nova categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableCats.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <p>
                      Esta categoria não possui nenhuma movimentação vinculada e pode ser removida
                      com segurança.
                    </p>
                  );
                })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRemovingCat(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmRemoveCategory()}
            >
              Confirmar remoção
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
