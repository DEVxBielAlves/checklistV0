-- Tabela principal para checklists
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

-- Habilitar RLS
alter table public.checklists enable row level security;

-- Policy de leitura pública (idempotente)
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'checklists' and policyname = 'Public can read checklists'
  ) then
    create policy "Public can read checklists"
      on public.checklists
      for select
      to public
      using (true);
  end if;
end $$;

-- Bucket público para imagens (sem alterar storage.objects)
insert into storage.buckets (id, name, public)
values ('checklist-images', 'checklist-images', true)
on conflict (id) do nothing;

-- Observação:
-- Não precisamos criar policies em storage.objects para este app,
-- pois as imagens são servidas via URL pública do bucket.
