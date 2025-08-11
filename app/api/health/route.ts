import { getSupabaseServerClient } from "@/lib/supabase/server"

const TABLE = process.env.CHECKLIST_TABLE_NAME || "checklist"
const BUCKET = process.env.CHECKLIST_BUCKET || "checklist-images"

function json(data: any, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    ...init,
  })
}

export async function GET() {
  const supabase = getSupabaseServerClient()

  // Check table connectivity
  let tableExists = false
  try {
    const probe = await supabase.from(TABLE).select("id").limit(1)
    tableExists = !probe.error
  } catch {
    tableExists = false
  }

  // Check bucket (optional for images)
  let bucketExists = false
  try {
    const { data } = await supabase.storage.getBucket(BUCKET)
    bucketExists = !!data
  } catch {
    bucketExists = false
  }

  return json({
    ok: tableExists,
    tableExists,
    tableName: TABLE,
    bucketExists,
    bucketName: BUCKET,
    message: tableExists
      ? `Conectado. Usando a tabela ${TABLE}.`
      : `Tabela ${TABLE} não encontrada. Ajuste CHECKLIST_TABLE_NAME ou crie a tabela.`,
  })
}
