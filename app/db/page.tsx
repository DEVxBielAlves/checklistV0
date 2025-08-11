"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Health = {
  ok: boolean
  tableExists: boolean
  tableName: "checklists" | "checklist" | null
  bucketExists: boolean
  message: string
}

type Checklist = {
  id: string
  titulo: string
  criadoEm: string
}

export default function DBInspectorPage() {
  const [health, setHealth] = useState<Health | null>(null)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<Checklist[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function check() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/health", { cache: "no-store" })
      const data = (await res.json()) as Health
      setHealth(data)
      if (data.ok) {
        const res2 = await fetch("/api/checklists", { cache: "no-store" })
        if (!res2.ok) throw new Error("Falha ao consultar /api/checklists")
        const list = (await res2.json()) as Checklist[]
        setItems(Array.isArray(list) ? list : [])
      } else {
        setItems([])
      }
    } catch (e: any) {
      setError(e?.message || "Erro ao verificar o DB")
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { check() }, [])

  return (
    <main className="mx-auto w-full max-w-3xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">DB Inspector</h1>
        <Button onClick={check} disabled={loading}>{loading ? "Verificando..." : "Recarregar"}</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conexão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">Tabela detectada:</span>
            <Badge variant={health?.tableExists ? "default" : "destructive"}>
              {health?.tableName || "—"}
            </Badge>
          </div>
          <div className="text-sm text-zinc-700">{health?.message || "—"}</div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Bucket checklist-images:</span>
            <Badge variant={health?.bucketExists ? "default" : "secondary"}>
              {health?.bucketExists ? "OK" : "Não encontrado (apenas necessário para imagens)"}
            </Badge>
          </div>
          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Registros (primeiros 10)</CardTitle>
        </CardHeader>
        <CardContent>
          {items === null ? (
            <div className="text-sm text-zinc-600">Carregando…</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-zinc-600">Nenhum registro encontrado.</div>
          ) : (
            <div className="space-y-2">
              {items.slice(0, 10).map((c) => (
                <div key={c.id} className="rounded-md border p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{c.titulo}</div>
                    <Badge variant="secondary" className="text-[11px]">{c.criadoEm}</Badge>
                  </div>
                  <div className="text-[11px] text-zinc-500">id: {c.id}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Como listar TODAS as tabelas no Supabase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-zinc-600">
            Para ver todas as tabelas diretamente no banco, use o SQL Editor no Dashboard do Supabase.
            Observação: certos schemas podem ser restritos e retornar “42501: permission denied” se o papel não tiver acesso [^2].
          </p>
          <pre className="rounded-md border bg-zinc-50 p-3 text-xs overflow-auto">
{`-- Liste todas as tabelas nos schemas mais comuns
select table_schema, table_name
from information_schema.tables
where table_type = 'BASE TABLE'
  and table_schema in ('public', 'storage', 'auth', 'extensions')
order by 1, 2;

-- Apenas do schema public:
-- select table_name from information_schema.tables where table_schema = 'public' order by 1;

-- Ver colunas de uma tabela específica (ex.: checklist)
-- select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = 'checklist' order by 1;
`}
          </pre>
          <p className="text-[12px] text-zinc-500">
            Dica: O app usa somente a(s) tabela(s) public.checklist(s) e o bucket checklist-images. A leitura pública de schemas
            “sensíveis” (como auth e vault) é bloqueada por padrão e pode gerar 42501 [^2].
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
