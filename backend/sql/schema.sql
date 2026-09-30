create extension if not exists pgcrypto;

create table if not exists public.comments (
    id uuid primary key default gen_random_uuid(),
    external_id text unique,
    username text not null,
    text text not null default '',
    commented_at timestamptz not null default now(),
    source text not null check (source in ('instagram', 'manual')),
    created_at timestamptz not null default now()
);

create table if not exists public.draws (
    id uuid primary key default gen_random_uuid(),
    comment_id uuid not null references public.comments(id) on delete cascade,
    username text not null,
    drawn_at timestamptz not null default now()
);

create index if not exists comments_username_idx on public.comments (username);
create index if not exists draws_username_idx on public.draws (username);

create or replace function public.reset_current_draw()
returns void language plpgsql security invoker as $$
begin
    delete from public.draws;
    delete from public.comments;
end;
$$;

