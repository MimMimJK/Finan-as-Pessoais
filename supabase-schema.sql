-- Execute no SQL Editor do Supabase.
-- Cada usuário autenticado só pode acessar seus próprios registros.

create table if not exists public.profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
    created_at timestamptz not null default now()
);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (user_id, username)
    values (
        new.id,
        lower(new.raw_user_meta_data ->> 'username')
    );
    return new;
end;
$$;

revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
    after insert on auth.users
    for each row execute function public.create_profile_for_new_user();

create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    name text not null check (char_length(trim(name)) between 1 and 40),
    type text not null check (type in ('income', 'expense')),
    created_at timestamptz not null default now(),
    unique (user_id, name)
);

create table if not exists public.transactions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    description text not null check (char_length(trim(description)) > 0),
    value numeric(12, 2) not null check (value > 0),
    date date not null,
    category text not null,
    type text not null check (type in ('income', 'expense')),
    note text not null default '',
    status text not null default 'pending' check (status in ('pending', 'confirmed')),
    is_fixed boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Permite atualizar projetos que já criaram a tabela antes deste recurso.
alter table public.transactions
    add column if not exists is_fixed boolean not null default false;

alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.profiles enable row level security;

revoke all on table public.profiles, public.categories, public.transactions from anon;
grant usage on schema public to authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.categories, public.transactions to authenticated;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
    on public.profiles for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
    on public.profiles for insert to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
    on public.profiles for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read own categories" on public.categories;
create policy "Users can read own categories"
    on public.categories for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own categories" on public.categories;
create policy "Users can insert own categories"
    on public.categories for insert to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own categories" on public.categories;
create policy "Users can update own categories"
    on public.categories for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own categories" on public.categories;
create policy "Users can delete own categories"
    on public.categories for delete to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own transactions" on public.transactions;
create policy "Users can read own transactions"
    on public.transactions for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own transactions" on public.transactions;
create policy "Users can insert own transactions"
    on public.transactions for insert to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own transactions" on public.transactions;
create policy "Users can update own transactions"
    on public.transactions for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own transactions" on public.transactions;
create policy "Users can delete own transactions"
    on public.transactions for delete to authenticated
    using ((select auth.uid()) = user_id);
