import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  Info,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useFinance, useRefreshFinance } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações — Patrimo" },
      {
        name: "description",
        content: "Alertas úteis e inteligentes sobre orçamentos, faturas e compromissos.",
      },
      { property: "og:title", content: "Notificações — Patrimo" },
      {
        property: "og:description",
        content: "Alertas úteis e inteligentes sobre orçamentos, faturas e compromissos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Notificacoes,
});

function Notificacoes() {
  const { data, isLoading } = useFinance();
  const refresh = useRefreshFinance();

  const [filterLevel, setFilterLevel] = useState<string>("todas");

  async function markAllRead() {
    if (!data) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", data.userId)
      .eq("read", false);
    if (error) {
      toast.error("Não foi possível atualizar.");
      return;
    }
    await refresh();
    toast.success("Todas as notificações foram marcadas como lidas.");
  }

  async function markSingleRead(id: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);
    if (error) {
      toast.error("Não foi possível atualizar o aviso.");
      return;
    }
    await refresh();
  }

  if (isLoading || !data) {
    return (
      <AppShell title="Notificações">
        <Skeleton className="h-48 w-full rounded-xl" />
      </AppShell>
    );
  }

  const unreadCount = data.notifications.filter((n) => !n.read).length;

  const filteredNotifications = data.notifications.filter((n) => {
    if (filterLevel === "todas") return true;
    if (filterLevel === "nao_lidas") return !n.read;
    return n.level === filterLevel;
  });

  return (
    <AppShell
      title="Notificações"
      description="Avisos sobre orçamentos, faturas e compromissos em tempo real"
      actions={
        unreadCount > 0 ? (
          <Button size="sm" variant="outline" onClick={() => void markAllRead()}>
            <CheckCheck className="mr-1.5 h-4 w-4" /> Marcar todas como lidas
          </Button>
        ) : null
      }
    >
      <div className="space-y-6">
        {/* FILTROS DE NÍVEL */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "todas", label: "Todas" },
            { id: "nao_lidas", label: `Não lidas (${unreadCount})` },
            { id: "urgente", label: "Urgentes" },
            { id: "atencao", label: "Atenção" },
            { id: "info", label: "Informativas" },
          ].map((tab) => (
            <Button
              key={tab.id}
              type="button"
              variant={filterLevel === tab.id ? "default" : "outline"}
              size="sm"
              className="h-8 rounded-full text-xs font-medium"
              onClick={() => setFilterLevel(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* LISTAGEM DE NOTIFICAÇÕES OU ESTADO VAZIO ACOLHEDOR */}
        {filteredNotifications.length === 0 ? (
          <Card className="border-border/80">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-positive/10 text-positive">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-base text-foreground">
                Tudo tranquilo por aqui!
              </h3>
              <p className="max-w-md text-xs text-muted-foreground leading-relaxed">
                Vamos avisar quando uma fatura, orçamento ou conta futura precisar da sua atenção. Nenhum imprevisto detectado no momento.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((n) => {
              const isUrgente = n.level === "urgente";
              const isAtencao = n.level === "atencao" || n.level === "alerta";
              const isInfo = n.level === "info";

              return (
                <Card
                  key={n.id}
                  className={`transition-all hover:shadow-xs ${
                    n.read
                      ? "opacity-60 bg-card/60"
                      : isUrgente
                        ? "border-destructive/40 bg-destructive/5"
                        : isAtencao
                          ? "border-amber-500/40 bg-amber-500/5"
                          : "border-border"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            isUrgente
                              ? "bg-destructive/10 text-destructive"
                              : isAtencao
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-primary/10 text-primary"
                          }`}
                        >
                          {isUrgente ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : isAtencao ? (
                            <AlertCircle className="h-4 w-4" />
                          ) : (
                            <Info className="h-4 w-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-foreground">
                              {n.title}
                            </p>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                isUrgente
                                  ? "border-destructive/40 text-destructive bg-destructive/10"
                                  : isAtencao
                                    ? "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                                    : "border-primary/40 text-primary bg-primary/10"
                              }`}
                            >
                              {isUrgente ? "Urgente" : isAtencao ? "Atenção" : "Informativo"}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                            {n.body}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                          {formatDate(n.created_at.slice(0, 10))}
                        </span>

                        {!n.read && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[11px] text-muted-foreground hover:text-foreground px-1.5"
                            onClick={() => void markSingleRead(n.id)}
                            title="Marcar como lida"
                          >
                            <Check className="mr-1 h-3 w-3" /> Marcar lida
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
