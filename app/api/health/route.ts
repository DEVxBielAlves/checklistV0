import { getSupabaseServerClient } from "@/lib/supabase/server"

function json(data: any, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    ...init,
  })
}

export async function GET() {
  const supabase = getSupabaseServerClient()

  // Detectar nome da tabela: plural vs singular
  let tableExists = false
  let tableName: "checklists" | "checklist" | null = null

  try {
    const tryPlural = await supabase.from("checklists").select("id").limit(1)
    if (!tryPlural.error) {
      tableExists = true
      tableName = "checklists"
    } else {
      const trySingular = await supabase.from("checklist").select("id").limit(1)
      if (!trySingular.error) {
        tableExists = true
        tableName = "checklist"
      }
    }
  } catch {
    tableExists = false
  }

  // Verificar bucket (não obrigatório para leitura)
  let bucketExists = false
  try {
    const { data } = await supabase.storage.getBucket("checklist-images")
    bucketExists = !!data
  } catch {
    bucketExists = false
  }

  return json({
    ok: tableExists,
    tableExists,
    tableName,
    bucketExists,
    message: tableExists
      ? `Conectado. Usando a tabela ${tableName}.`
      : "Tabela não encontrada. Crie 'public.checklists' (ou 'public.checklist') e rode novamente.",
  })
}
