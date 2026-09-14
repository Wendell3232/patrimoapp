import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
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
      { name: "description", content: "Alertas de orçamento, faturas e compromissos." },
      { property: "og:title", content: "Notificações — Patrimo" },
      { property: "og:description", content: "Alertas de orçamento, faturas e compromissos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Notificacoes,
});

function Notificacoes() {
  const { data, isLoading } = useFinance();
  const refresh = useRefreshFinance();

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
  }

  if (isLoading || !data) {
    return (
      <AppShell title="Notificações">
        <Skeleton className="h-48 w-full rounded-xl" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Notificações"
      description="Avisos sobre orçamentos, faturas e compromissos"
      actions={
        data.notifications.some((n) => !n.read) ? (
          <Button size="sm" variant="outline" onClick={() => void markAllRead()}>
            Marcar todas como lidas
          </Button>
        ) : null
      }
    >
      {data.notifications.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma notificação por aqui.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.notifications.map((notification) => (
            <Card key={notification.id} className={notification.read ? "opacity-70" : ""}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{notification.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDate(notification.created_at.slice(0, 10))}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
