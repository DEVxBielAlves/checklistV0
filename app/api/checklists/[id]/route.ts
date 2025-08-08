import { getSupabaseServerClient } from "@/lib/supabase/server"

const TABLE = process.env.CHECKLIST_TABLE_NAME || "checklist"
const BUCKET = process.env.CHECKLIST_BUCKET || "checklist-images"

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

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient()
  const id = params.id
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).single()
  if (error) return json({ error: error.message }, { status: 404 })
  return json(toCamelChecklist(data as ChecklistRow))
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient()
  const id = params.id

  const { error } = await supabase.from(TABLE).delete().eq("id", id)
  if (error) return json({ error: error.message }, { status: 500 })

  // Best-effort: clean up storage folder
  const { data: list, error: listErr } = await supabase.storage.from(BUCKET).list(id)
  if (!listErr && list && list.length > 0) {
    const paths = list.map((o) => `${id}/${o.name}`)
    await supabase.storage.from(BUCKET).remove(paths)
  }

  return json({ ok: true })
}
