-- CatatanBarokah Telur - shared no-login database
-- Jalankan seluruh script ini di Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('masuk', 'keluar')),
  amount numeric(15,2) not null check (amount > 0),
  category text not null default 'Lain-lain',
  description text not null default '',
  transaction_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transactions drop constraint if exists transactions_user_id_fkey;
alter table public.transactions drop column if exists user_id;

create index if not exists transactions_date_idx on public.transactions(transaction_date desc, created_at desc);
create index if not exists transactions_type_idx on public.transactions(type);
alter table public.transactions enable row level security;

drop policy if exists "Users can read own transactions" on public.transactions;
drop policy if exists "Users can insert own transactions" on public.transactions;
drop policy if exists "Users can update own transactions" on public.transactions;
drop policy if exists "Users can delete own transactions" on public.transactions;
drop policy if exists "Public can read transactions" on public.transactions;
drop policy if exists "Public can insert transactions" on public.transactions;
drop policy if exists "Public can update transactions" on public.transactions;
drop policy if exists "Public can delete transactions" on public.transactions;

create policy "Public can read transactions" on public.transactions for select to anon, authenticated using (true);
create policy "Public can insert transactions" on public.transactions for insert to anon, authenticated with check (true);
create policy "Public can update transactions" on public.transactions for update to anon, authenticated using (true) with check (true);
create policy "Public can delete transactions" on public.transactions for delete to anon, authenticated using (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.transactions to anon, authenticated;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at before update on public.transactions for each row execute function public.set_updated_at();

-- Shared opening cash. One row is used by the no-login shared ledger.
create table if not exists public.cash_settings (
  id boolean primary key default true check (id = true),
  opening_balance numeric(15,2) not null default 0 check (opening_balance >= 0),
  updated_at timestamptz not null default now()
);
insert into public.cash_settings (id, opening_balance) values (true, 0) on conflict (id) do nothing;
alter table public.cash_settings enable row level security;
drop policy if exists "Public can read cash settings" on public.cash_settings;
drop policy if exists "Public can insert cash settings" on public.cash_settings;
drop policy if exists "Public can update cash settings" on public.cash_settings;
create policy "Public can read cash settings" on public.cash_settings for select to anon, authenticated using (true);
create policy "Public can insert cash settings" on public.cash_settings for insert to anon, authenticated with check (id = true);
create policy "Public can update cash settings" on public.cash_settings for update to anon, authenticated using (true) with check (id = true);
grant select, insert, update on table public.cash_settings to anon, authenticated;
