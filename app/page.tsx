"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { listChecklists, removeChecklist, type ChecklistStored } from "@/lib/storage"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { downloadChecklistPdfComImagens, downloadChecklistPdfPrincipal } from "@/lib/pdf"
import { Eye, FileDown, Plus, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function formatCreatedBadge(value: string | undefined | null) {
  if (!value) return "—"
  // Expecting "dd-mm-yyyy  HH:mm:ss" (double-space tolerance)
  const m = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim())
  if (m) {
    const [, dd, mm, yyyy, HH, MM] = m
    return `${dd}/${mm}/${yyyy} ${HH}:${MM}`
  }
  // Fallback: try ISO/Date
  const d = new Date(value)
  if (!isNaN(d.getTime())) {
    return d.toLocaleString("pt-BR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
  }
  return value
}

export default function HomePage() {
  const { toast } = useToast()
  const [items, setItems] = useState<ChecklistStored[] | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState("")
  const [q, setQ] = useState("")

  async function refresh() {
    try {
      const data = await listChecklists()
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setItems([])
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const list = Array.isArray(items) ? items : []

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return list
    return list.filter((c) => {
      const di = c.dadosIniciais || { placa: "", motorista: "", inspetor: "", marca: "", modelo: "" }
      return (
        (c.titulo || "").toLowerCase().includes(term) ||
        (di.motorista || "").toLowerCase().includes(term) ||
        (di.inspetor || "").toLowerCase().includes(term) ||
        (di.placa || "").toLowerCase().includes(term)
      )
    })
  }, [q, list])

  async function onDeleteConfirm() {
    if (!confirmId) return
    if (confirmText.trim().toLowerCase() !== "delete") {
      toast({ title: "Digite delete para confirmar", variant: "destructive" })
      return
    }
    await removeChecklist(confirmId)
    setConfirmId(null)
    setConfirmText("")
    await refresh()
    toast({ title: "Checklist excluído" })
  }

  return (
    <main
      className="mx-auto w-full max-w-3xl p-4 min-h-[100svh]"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 3.5rem)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Histórico de Checklists</h1>
        {/* Botão também está na barra fixa inferior; este aqui fica como ação secundária */}
        <Link href="/checklist">
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" /> Novo
          </Button>
        </Link>
      </div>

      {/* Busca funcional por nome (motorista, inspetor) e placa/título */}
      <div className="mb-4">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome (motorista, inspetor) ou placa"
          className="h-10"
        />
      </div>

      {items === null ? (
        <Card>
          <CardContent className="p-3 text-sm text-zinc-600">Carregando…</CardContent>
        </Card>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="p-3 text-sm text-zinc-600">
            Nenhum checklist salvo. Clique em “Novo” para iniciar.
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-3 text-sm text-zinc-600">
            Nenhum resultado para: “{q}”
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <Card key={c.id}>
              <CardHeader className="p-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="truncate">{c.titulo}</span>
                  <Badge variant="secondary" className="text-[11px]">
                    {formatCreatedBadge(c.criadoEm)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="grid grid-cols-2 gap-y-1 text-xs text-zinc-700">
                  <div>
                    <span className="font-medium">Placa:</span> {c.dadosIniciais?.placa ?? "—"}
                  </div>
                  <div>
                    <span className="font-medium">Motorista:</span> {c.dadosIniciais?.motorista ?? "—"}
                  </div>
                  <div>
                    <span className="font-medium">Inspetor:</span> {c.dadosIniciais?.inspetor ?? "—"}
                  </div>
                  <div>
                    <span className="font-medium">Marca/Modelo:</span>{" "}
                    {(c.dadosIniciais?.marca ?? "—")} • {(c.dadosIniciais?.modelo ?? "—")}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/checklist/${c.id}`}>
                    <Button size="sm" className="h-9">
                      <Eye className="mr-2 h-4 w-4" /> Ver mais
                    </Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="h-9">
                        <FileDown className="mr-2 h-4 w-4" /> Baixar PDF
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuLabel>Modelos</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => downloadChecklistPdfPrincipal(c)}>
                        Principal (sem fotos)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => downloadChecklistPdfComImagens(c)}>
                        Secundário (com imagens)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="ml-auto flex items-center gap-2">
                    {confirmId === c.id ? (
                      <>
                        <Input
                          placeholder='digite "delete"'
                          value={confirmText}
                          onChange={(e) => setConfirmText(e.target.value)}
                          className="h-9 w-36"
                        />
                        <Button size="sm" variant="destructive" onClick={onDeleteConfirm} className="h-9">
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setConfirmId(null)
                            setConfirmText("")
                          }}
                          className="h-9"
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setConfirmId(c.id)} className="h-9">
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Barra de ação inferior (quase toda a largura) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-center px-4 py-2" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}>
          <Link href="/checklist" className="w-full">
            <Button className="w-full h-12 text-base">+ Novo checklist</Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
