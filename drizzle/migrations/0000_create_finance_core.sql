-- Enums
create type public.account_type as enum ('corrente','poupanca','dinheiro','investimentos');
create type public.tx_kind as enum ('receita','despesa','transferencia');
create type public.category_kind as enum ('receita','despesa');
create type public.commitment_status as enum ('pendente','pago');
create type public.plan_kind as enum ('mensal','anual');

-- Profiles
create table public.profiles (
  id uuid primary key,
  full_name text not null default '',
  email text,
  avatar_url text,
  onboarding_completed boolean not null default false,
  onboarding_step smallint not null default 1,
  plan public.plan_kind,
  monthly_income numeric(14,2),
  main_goal text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

-- Accounts
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  type public.account_type not null default 'corrente',
  institution text,
  opening_balance numeric(14,2) not null default 0,
  color text not null default '#2563eb',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index accounts_user_idx on public.accounts(user_id);
grant select, insert, update, delete on public.accounts to authenticated;
grant all on public.accounts to service_role;
alter table public.accounts enable row level security;
create policy "own accounts" on public.accounts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Credit cards
create table public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  brand text,
  limit_amount numeric(14,2) not null default 0,
  closing_day smallint not null default 28,
  due_day smallint not null default 5,
  payment_account_id uuid references public.accounts(id) on delete set null,
  color text not null default '#7c3aed',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index credit_cards_user_idx on public.credit_cards(user_id);
grant select, insert, update, delete on public.credit_cards to authenticated;
grant all on public.credit_cards to service_role;
alter table public.credit_cards enable row level security;
create policy "own cards" on public.credit_cards for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  kind public.category_kind not null default 'despesa',
  color text not null default '#64748b',
  icon text not null default 'circle',
  created_at timestamptz not null default now()
);
create index categories_user_idx on public.categories(user_id);
grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "own categories" on public.categories for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind public.tx_kind not null,
  amount numeric(14,2) not null check (amount > 0),
  occurred_on date not null,
  description text not null default '',
  notes text,
  category_id uuid references public.categories(id) on delete set null,
  account_id uuid references public.accounts(id) on delete cascade,
  to_account_id uuid references public.accounts(id) on delete cascade,
  credit_card_id uuid references public.credit_cards(id) on delete cascade,
  installment_group uuid,
  installment_number smallint,
  installment_total smallint,
  is_invoice_payment boolean not null default false,
  paid boolean not null default true,
  created_at timestamptz not null default now()
);
create index transactions_user_date_idx on public.transactions(user_id, occurred_on);
create index transactions_card_idx on public.transactions(credit_card_id);
grant select, insert, update, delete on public.transactions to authenticated;
grant all on public.transactions to service_role;
alter table public.transactions enable row level security;
create policy "own transactions" on public.transactions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Commitments
create table public.commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  due_date date not null,
  kind public.category_kind not null default 'despesa',
  status public.commitment_status not null default 'pendente',
  category_id uuid references public.categories(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  credit_card_id uuid references public.credit_cards(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index commitments_user_due_idx on public.commitments(user_id, due_date);
grant select, insert, update, delete on public.commitments to authenticated;
grant all on public.commitments to service_role;
alter table public.commitments enable row level security;
create policy "own commitments" on public.commitments for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Goals
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  target_amount numeric(14,2) not null check (target_amount > 0),
  current_amount numeric(14,2) not null default 0,
  target_date date not null,
  account_id uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now()
);
create index goals_user_idx on public.goals(user_id);
grant select, insert, update, delete on public.goals to authenticated;
grant all on public.goals to service_role;
alter table public.goals enable row level security;
create policy "own goals" on public.goals for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Budgets
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category_id uuid not null references public.categories(id) on delete cascade,
  month date not null,
  limit_amount numeric(14,2) not null check (limit_amount > 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id, month)
);
create index budgets_user_month_idx on public.budgets(user_id, month);
grant select, insert, update, delete on public.budgets to authenticated;
grant all on public.budgets to service_role;
alter table public.budgets enable row level security;
create policy "own budgets" on public.budgets for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  body text not null default '',
  level text not null default 'info',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notifications" on public.notifications for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
