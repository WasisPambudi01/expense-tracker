-- Jalankan skrip ini di Supabase: buka project kamu → SQL Editor → New query → paste → Run

create table if not exists public.app_data (
  user_id uuid references auth.users(id) on delete cascade primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_data enable row level security;

create policy "Users can view own data"
  on public.app_data for select
  using (auth.uid() = user_id);

create policy "Users can insert own data"
  on public.app_data for insert
  with check (auth.uid() = user_id);

create policy "Users can update own data"
  on public.app_data for update
  using (auth.uid() = user_id);
