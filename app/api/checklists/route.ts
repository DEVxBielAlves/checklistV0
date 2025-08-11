import { getSupabaseServerClient } from "@/lib/supabase/server"

const TABLE = process.env.CHECKLIST_TABLE_NAME || "checklist"
const BUCKET = process.env.CHECKLIST_BUCKET || "checklist-images"

type MediaStored = {
  nome: string
  tipo: string
  tamanho: number
  kind: "image"
  dataUrl: string // public URL after upload
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

type ChecklistStored = {
  id: string
  titulo: string
  criadoEm: string
  dadosIniciais: {
    placa: string
    motorista: string
    inspetor: string
    marca: string
    modelo: string
  }
  verificacoes: Array<{
    titulo: string
    detalhe?: string
    status: "conforme" | "nao_conforme" | "na" | null
    observacoes: string | null
  }>
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

function ensureId(id?: string) {
  return id && id.length > 0 ? id : Math.random().toString(36).slice(2, 10)
}

function decodeBase64ToUint8Array(b64: string) {
  if (typeof atob === "function") {
    const binary = atob(b64)
    const len = binary.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  } else {
    const buf = Buffer.from(b64, "base64")
    return new Uint8Array(buf)
  }
}

function parseDataUrlToBlob(dataUrl: string): { blob: Blob; contentType: string; ext: string } {
  const [meta, base64] = dataUrl.split(",")
  const m = /^data:(.*?);base64$/.exec(meta || "")
  const contentType = m?.[1] || "image/jpeg"
  const bytes = decodeBase64ToUint8Array(base64 || "")
  const blob = new Blob([bytes], { type: contentType })
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg"
  return { blob, contentType, ext }
}

function toCamelChecklist(row: ChecklistRow): ChecklistStored {
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
            midias: Array.isArray(ins.midias) ? ins.midias.map((m) => ({ ...m } as MediaStored)) : [],
          }))
        : [],
    completo: !!row.completo,
  }
}

export async function GET() {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return json({ error: error.message }, { status: 500 })
  const list = (data || []).map(toCamelChecklist)
  return json(list)
}

export async function POST(req: Request) {
  const supabase = getSupabaseServerClient()
  const body = (await req.json()) as ChecklistStored

  const id = ensureId(body.id)
  const safe: ChecklistStored = { ...body, id }

  // Upload media (DataURL -> Storage público)
  for (let i = 0; i < safe.inspecoes.length; i++) {
    const ins = safe.inspecoes[i]
    const newMidias: MediaStored[] = []
    for (let j = 0; j < (ins.midias?.length || 0); j++) {
      const m = ins.midias[j]
      if (m?.dataUrl?.startsWith("data:")) {
        try {
          const { blob, contentType, ext } = parseDataUrlToBlob(m.dataUrl)
          const path = `${id}/${Date.now()}-${i}-${j}.${ext}`
          const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, {
            contentType,
            upsert: true,
          })
          if (upErr) {
            console.error("Upload error:", upErr)
            continue
          }
          const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
          newMidias.push({ ...m, dataUrl: pub.publicUrl })
        } catch (e) {
          console.error("Upload error:", e)
        }
      } else if (m?.dataUrl) {
        newMidias.push(m)
      }
    }
    safe.inspecoes[i] = { ...ins, midias: newMidias }
  }

  // Persist
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      {
        id: safe.id,
        titulo: safe.titulo,
        criado_em: safe.criadoEm,
        dados_iniciais: safe.dadosIniciais,
        verificacoes: safe.verificacoes,
        inspecoes: safe.inspecoes,
        completo: safe.completo,
      },
      { onConflict: "id" }
    )
    .select("*")

  if (error || !data || data.length === 0) {
    return json({ error: error?.message || "Upsert failed" }, { status: 500 })
  }

  return json(toCamelChecklist(data[0] as ChecklistRow))
}
