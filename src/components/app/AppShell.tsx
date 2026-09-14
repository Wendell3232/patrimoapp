import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  Bell,
  CalendarClock,
  CreditCard,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PiggyBank,
  Settings,
  Sparkles,
  Target,
  User,
  Wallet,
  X,
} from "lucide-react";

import { ThemeToggle } from "@/components/app/ThemeToggle";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useFinance, useRefreshFinance } from "@/lib/data";
import { syncNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    label: "VISÃO FINANCEIRA",
    items: [
      { to: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
      { to: "/movimentacoes", label: "Movimentações", icon: ArrowLeftRight },
      { to: "/contas", label: "Contas", icon: Wallet },
      { to: "/cartoes", label: "Cartões", icon: CreditCard },
    ],
  },
  {
    label: "PLANEJAMENTO",
    items: [
      { to: "/orcamentos", label: "Orçamentos", icon: PiggyBank },
      { to: "/metas", label: "Metas", icon: Target },
      { to: "/compromissos", label: "Contas futuras", icon: CalendarClock },
    ],
  },
  {
    label: "ANÁLISES",
    items: [
      { to: "/relatorios", label: "Relatórios", icon: LineChart },
      { to: "/agente", label: "Agente Financeiro", icon: Sparkles },
    ],
  },
  {
    label: "MINHA CONTA",
    items: [
      { to: "/notificacoes", label: "Notificações", icon: Bell, badge: true },
      { to: "/configuracoes", label: "Configurações", icon: Settings },
      { to: "/perfil", label: "Perfil", icon: User },
    ],
  },
] as const;

const MOBILE_NAV = [
  { to: "/dashboard", label: "Início", icon: LayoutDashboard },
  { to: "/movimentacoes", label: "Movimentações", icon: ArrowLeftRight },
  { to: "/cartoes", label: "Cartões", icon: CreditCard },
  { to: "/orcamentos", label: "Orçamentos", icon: PiggyBank },
  { to: "/compromissos", label: "Contas futuras", icon: CalendarClock },
] as const;

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useFinance();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const unread = data?.notifications.filter((n) => !n.read).length ?? 0;
  const refresh = useRefreshFinance();
  const synced = useRef(false);
  const profileName = data?.profile?.full_name?.trim() || "Minha conta";
  const initials = profileName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    if (!data || synced.current) return;
    synced.current = true;
    void syncNotifications(data).then((created) => {
      if (created > 0) void refresh();
    });
  }, [data, refresh]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function renderSidebar(mini: boolean) {
    const linkClass = (active: boolean) =>
      cn(
        "group flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        mini && "justify-center px-2",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
      );

    return (
      <div className="flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div
          className={cn(
            "flex h-[72px] items-center justify-between border-b border-sidebar-border px-5",
            mini && "px-2",
          )}
        >
          <Link
            to="/dashboard"
            className="flex items-center gap-3 text-base font-semibold"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground shadow-sm">
              P
            </span>
            {!mini && "Patrimo"}
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="space-y-1">
              {!mini && (
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const active = pathname.startsWith(item.to);
                const hasBadge = "badge" in item && item.badge && unread > 0;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    title={item.label}
                    onClick={() => setMenuOpen(false)}
                    className={linkClass(active)}
                  >
                    <item.icon
                      className={cn("h-4 w-4 shrink-0", active && "text-sidebar-primary")}
                    />
                    {!mini && <span className="truncate">{item.label}</span>}
                    {!mini && hasBadge && (
                      <span className="ml-auto rounded-full bg-sidebar-primary px-2 py-0.5 text-[11px] font-semibold text-sidebar-primary-foreground">
                        {unread}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <Button
            type="button"
            variant="ghost"
            onClick={signOut}
            title="Sair da conta"
            className={cn(
              linkClass(false),
              "h-auto w-full justify-start text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!mini && <span>Sair</span>}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen bg-background lg:grid",
        collapsed ? "lg:grid-cols-[76px_1fr]" : "lg:grid-cols-[260px_1fr]",
      )}
    >
      <aside className="sticky top-0 hidden h-screen transition-all lg:block">
        {renderSidebar(collapsed)}
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-[min(290px,86vw)]">{renderSidebar(false)}</div>
        </div>
      )}

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
          <div className="flex min-h-[72px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden lg:inline-flex"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>
              {description && (
                <p className="truncate text-[13px] text-muted-foreground">{description}</p>
              )}
            </div>
            <div className="hidden items-center gap-2 md:flex">{actions}</div>
            <ThemeToggle />
            <Button asChild variant="ghost" size="icon" className="relative hidden sm:flex">
              <Link to="/notificacoes" aria-label="Notificações">
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
                )}
              </Link>
            </Button>
            <Button asChild variant="ghost" className="hidden h-10 gap-2 px-2 sm:flex">
              <Link to="/perfil" aria-label="Abrir perfil">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {initials || "P"}
                </span>
                <span className="hidden max-w-28 truncate text-sm text-foreground xl:block">
                  {profileName}
                </span>
              </Link>
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pb-12">
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden">
          <div className="grid grid-cols-5">
            {MOBILE_NAV.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[10px]",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
