-- Create table to store checklists
create table if not exists public.checklists (
  id text primary key,
  titulo text not null,
  criado_em text not null,
  dados_iniciais jsonb not null,
  verificacoes jsonb not null,
  inspecoes jsonb not null,
  completo boolean not null default false,
  created_at timestamptz not null default now()
);

-- Enable RLS with permissive public read
alter table public.checklists enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'checklists' and policyname = 'Public read checklists'
  ) then
    create policy "Public read checklists" on public.checklists
      for select
      to public
      using (true);
  end if;
end $$;

-- Storage bucket for images
insert into storage.buckets (id, name, public)
select 'checklist-images', 'checklist-images', true
where not exists (select 1 from storage.buckets where id = 'checklist-images');

-- Public read on bucket objects
alter table storage.objects enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'objects' and policyname = 'Public read checklist images'
  ) then
    create policy "Public read checklist images" on storage.objects
      for select
      to public
      using (bucket_id = 'checklist-images');
  end if;
end $$;
