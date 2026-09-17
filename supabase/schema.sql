-- CatatanBarokah Telur - shared no-login database
-- Jalankan seluruh script ini di Supabase SQL Editor.
-- Tidak menggunakan Supabase Auth. Semua data berada dalam satu buku kas bersama.

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

-- Remove old Auth dependency if an earlier schema existed.
alter table public.transactions drop constraint if exists transactions_user_id_fkey;
alter table public.transactions drop column if exists user_id;

create index if not exists transactions_date_idx
  on public.transactions(transaction_date desc, created_at desc);
create index if not exists transactions_type_idx
  on public.transactions(type);

alter table public.transactions enable row level security;

-- No-login app: the public frontend uses the Supabase publishable key.
-- Anyone who can access the app can read/write this shared ledger.
drop policy if exists "Users can read own transactions" on public.transactions;
drop policy if exists "Users can insert own transactions" on public.transactions;
drop policy if exists "Users can update own transactions" on public.transactions;
drop policy if exists "Users can delete own transactions" on public.transactions;
drop policy if exists "Public can read transactions" on public.transactions;
drop policy if exists "Public can insert transactions" on public.transactions;
drop policy if exists "Public can update transactions" on public.transactions;
drop policy if exists "Public can delete transactions" on public.transactions;

create policy "Public can read transactions"
  on public.transactions for select
  to anon, authenticated
  using (true);

create policy "Public can insert transactions"
  on public.transactions for insert
  to anon, authenticated
  with check (true);

create policy "Public can update transactions"
  on public.transactions for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Public can delete transactions"
  on public.transactions for delete
  to anon, authenticated
  using (true);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.transactions to anon, authenticated;
