"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, XCircle, Wrench } from 'lucide-react'

type Health = {
  tableExists: boolean
  bucketExists: boolean
  createdBucket: boolean
  next: string
}

const DDL_SQL = `-- Criação da tabela e policies para o checklist + bucket público
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

-- Bucket de imagens (público para leitura)
insert into storage.buckets (id, name, public)
select 'checklist-images', 'checklist-images', true
where not exists (select 1 from storage.buckets where id = 'checklist-images');

-- Policies de leitura pública do bucket (opcional se bucket já é público)
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
end $$;`

export default function SetupPage() {
  const [health, setHealth] = useState<Health | null>(null)
  const [loading, setLoading] = useState(false)

  async function check() {
    setLoading(true)
    try {
      const res = await fetch("/api/health", { cache: "no-store" })
      const data = (await res.json()) as Health
      setHealth(data)
    } catch {
      setHealth(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    check()
  }, [])

  const Status = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className="flex items-center gap-2">
      {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-rose-600" />}
      <span className="text-sm">{label}</span>
      <Badge variant={ok ? "default" : "destructive"} className="ml-2">
        {ok ? "OK" : "FALTA"}
      </Badge>
    </div>
  )

  return (
    <main className="mx-auto w-full max-w-3xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Setup do Banco de Dados</h1>
        <Button onClick={check} disabled={loading}>
          <Wrench className="mr-2 h-4 w-4" />
          {loading ? "Verificando..." : "Verificar"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado atual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Status ok={!!health?.tableExists} label="Tabela public.checklists" />
          <Status ok={!!health?.bucketExists} label="Bucket storage checklist-images" />
          {health?.createdBucket && (
            <div className="text-xs text-zinc-500">Bucket checklist-images criado automaticamente.</div>
          )}
          <div className="rounded-md border p-3 text-sm text-zinc-700">
            {health?.next || "Clique em Verificar para avaliar o estado do ambiente."}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">SQL para criar tabela e policies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-zinc-600">
            Abra o Supabase Dashboard → Database → SQL Editor, cole o SQL abaixo e execute. Isso criará a tabela, habilitará RLS e
            configurará o bucket/policies para leitura pública das imagens [^1].
          </p>
          <Textarea value={DDL_SQL} readOnly className="min-h-[280px] font-mono text-xs" />
        </CardContent>
      </Card>
    </main>
  )
}
