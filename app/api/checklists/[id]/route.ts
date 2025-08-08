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
  return {
    id: row.id,
    titulo: row.titulo,
    criadoEm: row.criado_em,
    dadosIniciais: row.dados_iniciais,
    verificacoes: row.verificacoes || [],
    inspecoes:
      (row.inspecoes || []).map((ins) => ({
        ...ins,
        midias: (ins.midias || []).map((m) => ({ ...m })),
      })) || [],
    completo: row.completo,
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient()
  const id = params.id
  const { data, error } = await supabase.from("checklists").select("*").eq("id", id).single()
  if (error) return json({ error: error.message }, { status: 404 })
  return json(toCamelChecklist(data as ChecklistRow))
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient()
  const id = params.id

  // Delete DB row
  const { error } = await supabase.from("checklists").delete().eq("id", id)
  if (error) return json({ error: error.message }, { status: 500 })

  // Best-effort: clean up storage folder
  const bucket = "checklist-images"
  const { data: list, error: listErr } = await supabase.storage.from(bucket).list(id)
  if (!listErr && list && list.length > 0) {
    const paths = list.map((o) => `${id}/${o.name}`)
    await supabase.storage.from(bucket).remove(paths)
  }

  return json({ ok: true })
}
