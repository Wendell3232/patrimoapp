import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  Account,
  Budget,
  Category,
  Commitment,
  CreditCard,
  Goal,
  Transaction,
} from "@/lib/finance";

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  created_at: string;
  onboarding_completed: boolean;
  onboarding_step: number;
  plan: "mensal" | "anual" | null;
  monthly_income: number | null;
  main_goal: string | null;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  level: string;
  read: boolean;
  created_at: string;
}

export interface FinanceData {
  userId: string;
  profile: Profile | null;
  accounts: Account[];
  cards: CreditCard[];
  categories: Category[];
  transactions: Transaction[];
  commitments: Commitment[];
  goals: Goal[];
  budgets: Budget[];
  notifications: AppNotification[];
}

export const FINANCE_KEY = ["finance"] as const;

async function fetchFinance(): Promise<FinanceData> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Sessão expirada. Entre novamente.");
  const userId = userData.user.id;

  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    await supabase.rpc("ensure_profile", {
      p_full_name: (userData.user.user_metadata?.["full_name"] as string) ?? "",
      ...(userData.user.email ? { p_email: userData.user.email } : {}),
    });
    const retry = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    profile = retry.data;
  }

  const [accounts, cards, categories, transactions, commitments, goals, budgets, notifications] =
    await Promise.all([
      supabase.from("accounts").select("*").order("created_at"),
      supabase.from("credit_cards").select("*").order("created_at"),
      supabase.from("categories").select("*").order("name"),
      supabase.from("transactions").select("*").order("occurred_on", { ascending: false }),
      supabase.from("commitments").select("*").order("due_date"),
      supabase.from("goals").select("*").order("target_date"),
      supabase.from("budgets").select("*").order("month"),
      supabase.from("notifications").select("*").order("created_at", { ascending: false }),
    ]);

  function numeric<T>(rows: unknown, keys: string[]): T[] {
    const list = (rows ?? []) as Record<string, unknown>[];
    return list.map((row) => {
      const copy: Record<string, unknown> = { ...row };
      for (const key of keys) {
        if (copy[key] != null) {
          const n = Number(copy[key]);
          copy[key] = Number.isFinite(n) ? n : 0;
        }
      }
      return copy as T;
    });
  }

  return {
    userId,
    profile: (profile as unknown as Profile) ?? null,
    accounts: numeric<Account>(accounts.data, ["opening_balance"]),
    cards: numeric<CreditCard>(cards.data, ["limit_amount"]),
    categories: (categories.data ?? []) as unknown as Category[],
    transactions: numeric<Transaction>(transactions.data, ["amount"]),
    commitments: numeric<Commitment>(commitments.data, ["amount"]),
    goals: numeric<Goal>(goals.data, ["target_amount", "current_amount"]),
    budgets: numeric<Budget>(budgets.data, ["limit_amount"]),
    notifications: (notifications.data ?? []) as unknown as AppNotification[],
  };
}

export function useFinance() {
  return useQuery({
    queryKey: FINANCE_KEY,
    queryFn: fetchFinance,
    staleTime: 60_000,
  });
}

export function useRefreshFinance() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: FINANCE_KEY });
}
