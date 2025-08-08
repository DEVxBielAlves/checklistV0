import { getSupabaseServerClient } from "@/lib/supabase/server"

type MediaStored = {
  nome: string
  tipo: string
  tamanho: number
  kind: "image"
  dataUrl: string
}

type ChecklistRow = {
  id: string
  titulo: string
  criado_em: string
  dados_iniciais: any
  verificacoes: any[]
  inspecoes: Array<{
    titulo: string
    detalhe?: string
    status: "conforme" | "nao_conforme" | "na" | null
    observacoes: string | null
    midias: MediaStored[]
  }>
  completo: boolean
}

function json(data: any, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    ...init,
  })
}

function toCamelChecklist(row: ChecklistRow) {
  const di =
    row.dados_iniciais ?? {
      placa: "",
      motorista: "",
      inspetor: "",
      marca: "",
      modelo: "",
    }
  return {
    id: row.id,
    titulo: row.titulo,
    criadoEm: row.criado_em,
    dadosIniciais: di,
    verificacoes: Array.isArray(row.verificacoes) ? row.verificacoes : [],
    inspecoes:
      Array.isArray(row.inspecoes)
        ? row.inspecoes.map((ins) => ({
            ...ins,
            midias: Array.isArray(ins.midias) ? ins.midias.map((m) => ({ ...m })) : [],
          }))
        : [],
    completo: !!row.completo,
  }
}

async function resolveTableName(): Promise<"checklists" | "checklist"> {
  const supabase = getSupabaseServerClient()
  const { error: errPlural } = await supabase.from("checklists").select("id").limit(1)
  if (!errPlural) return "checklists"
  const { error: errSingular } = await supabase.from("checklist").select("id").limit(1)
  if (!errSingular) return "checklist"
  return "checklists"
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient()
  const table = await resolveTableName()
  const id = params.id
  const { data, error } = await supabase.from(table).select("*").eq("id", id).single()
  if (error) return json({ error: error.message }, { status: 404 })
  return json(toCamelChecklist(data as ChecklistRow))
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient()
  const table = await resolveTableName()
  const id = params.id

  const { error } = await supabase.from(table).delete().eq("id", id)
  if (error) return json({ error: error.message }, { status: 500 })

  // Limpeza best-effort de imagens
  const bucket = "checklist-images"
  const { data: list, error: listErr } = await supabase.storage.from(bucket).list(id)
  if (!listErr && list && list.length > 0) {
    const paths = list.map((o) => `${id}/${o.name}`)
    await supabase.storage.from(bucket).remove(paths)
  }

  return json({ ok: true })
}
