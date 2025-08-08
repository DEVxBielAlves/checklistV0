import { getSupabaseServerClient } from "@/lib/supabase/server"

function json(data: any, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    ...init,
  })
}

export async function GET() {
  const supabase = getSupabaseServerClient()

  // 1) Verifica se a tabela existe tentando selecionar 1 linha.
  let tableExists = true
  try {
    const { error } = await supabase.from("checklists").select("id").limit(1)
    if (error) {
      // Quando a tabela não existe, o PostgREST retorna erro. Marcar como inexistente.
      tableExists = false
    }
  } catch {
    tableExists = false
  }

  // 2) Verifica (e cria) o bucket checklist-images
  let bucketExists = false
  let createdBucket = false
  try {
    // getBucket retorna { data: { id: string } | null }
    const { data } = await supabase.storage.getBucket("checklist-images")
    bucketExists = !!data
    if (!bucketExists) {
      const { error: createErr } = await supabase.storage.createBucket("checklist-images", {
        public: true,
        fileSizeLimit: "50mb",
      })
      if (!createErr) {
        bucketExists = true
        createdBucket = true
      }
    }
  } catch {
    // ignora; bucketExists permanece false
  }

  // Observação de policies: este endpoint não cria policies SQL (isso é feito via SQL Editor).
  return json({
    tableExists,
    bucketExists,
    createdBucket,
    next: tableExists
      ? "Tabela ok. Se os uploads falharem com permissão, aplique as policies abaixo no SQL Editor."
      : "Crie a tabela rodando o SQL abaixo no SQL Editor do Supabase.",
  })
}
