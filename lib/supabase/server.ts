import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let serverClient: SupabaseClient | null = null

export function getSupabaseServerClient() {
  if (serverClient) return serverClient
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY // server-only
  if (!url || !key) throw new Error("Supabase server credentials are missing")
  serverClient = createClient(url, key, { auth: { persistSession: false } })
  return serverClient
}
