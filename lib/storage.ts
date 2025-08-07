"use client"

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
  dataUrl: string // armazenamos como data URL para persistir localmente
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
  criadoEm: string // dd-mm-yyyy  HH:mm:ss
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

const KEY = "checklists_v1"

function readAll(): ChecklistStored[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as ChecklistStored[]
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function writeAll(list: ChecklistStored[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function listChecklists(): ChecklistStored[] {
  return readAll().sort((a, b) => {
    // ordenar por criação descendente: dd-mm-yyyy  HH:mm:ss não é ISO; vamos manter a ordem de inserção reversa
    // Para confiabilidade, manteremos a ordem original de armazenamento (inserimos no topo ao salvar).
    return 0
  })
}

export function saveChecklist(record: ChecklistStored) {
  const list = readAll()
  // inserir no topo
  writeAll([record, ...list])
}

export function getChecklist(id: string): ChecklistStored | null {
  const list = readAll()
  return list.find((c) => c.id === id) || null
}

export function deleteChecklist(id: string) {
  const list = readAll()
  const filtered = list.filter((c) => c.id !== id)
  writeAll(filtered)
}
