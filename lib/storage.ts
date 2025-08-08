"use client"

// Supabase-backed persistence. API routes perform privileged operations server-side.

export type Status = "conforme" | "nao_conforme" | "na"

export type Step2Entry = {
  titulo: string
  detalhe?: string
  status: Status | null
  observacoes: string | null
}

export type Step3MediaStored = {
  nome: string
  tipo: string
  tamanho: number
  kind: "image"
  dataUrl: string // now a PUBLIC URL after upload
}

export type Step3Entry = {
  titulo: string
  detalhe?: string
  status: Status | null
  observacoes: string | null
  midias: Step3MediaStored[]
}

export type ChecklistStored = {
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
  verificacoes: Step2Entry[]
  inspecoes: Step3Entry[]
  completo: boolean
}

async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export async function listChecklists(): Promise<ChecklistStored[]> {
  try {
    const res = await api<any>("/api/checklists")
    return Array.isArray(res) ? (res as ChecklistStored[]) : []
  } catch {
    return []
  }
}

export async function saveChecklist(record: ChecklistStored): Promise<ChecklistStored> {
  return api<ChecklistStored>("/api/checklists", {
    method: "POST",
    body: JSON.stringify(record),
  })
}

export async function getChecklist(id: string): Promise<ChecklistStored | null> {
  try {
    return await api<ChecklistStored>(`/api/checklists/${id}`)
  } catch {
    return null
  }
}

export async function deleteChecklist(id: string) {
  await api(`/api/checklists/${id}`, { method: "DELETE" })
}

// Alias (some files use removeChecklist)
export const removeChecklist = deleteChecklist
