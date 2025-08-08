"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { listChecklists, removeChecklist, type ChecklistStored } from "@/lib/storage"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { downloadChecklistPdfComImagensById, downloadChecklistPdfPrincipalById } from "@/lib/pdf"
import { Eye, FileDown, Plus, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function HomePage() {
  const { toast } = useToast()
  const [items, setItems] = useState<ChecklistStored[] | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState("")

  async function refresh() {
    try {
      const data = await listChecklists()
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setItems([])
    }
  }

  useEffect(() => { refresh() }, [])

  const list = Array.isArray(items) ? items : []

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
    <main className="mx-auto w-full max-w-3xl p-4 min-h-[100svh] overflow-x-hidden" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 5rem)" }}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Histórico de Checklists</h1>
        <Link href="/checklist">
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" /> Novo checklist
          </Button>
        </Link>
      </div>

      {items === null ? (
        <Card>
          <CardContent className="p-4 text-sm text-zinc-600">Carregando…</CardContent>
        </Card>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-zinc-600">
            Nenhum checklist salvo. Clique em “Novo checklist” para iniciar.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((c) => {
            const di = c.dadosIniciais || { placa: "", motorista: "", inspetor: "", marca: "", modelo: "" }
            return (
              <Card key={c.id} className="w-full">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="truncate">{c.titulo}</span>
                    <Badge variant="secondary" className="text-[10px]">{c.criadoEm}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-zinc-700">
                    <div className="truncate"><span className="font-medium">Placa:</span> {di.placa || "—"}</div>
                    <div className="truncate"><span className="font-medium">Motorista:</span> {di.motorista || "—"}</div>
                    <div className="truncate"><span className="font-medium">Inspetor:</span> {di.inspetor || "—"}</div>
                    <div className="truncate"><span className="font-medium">Marca/Modelo:</span> {(di.marca || "—")} • {(di.modelo || "—")}</div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/checklist/${c.id}`}>
                      <Button size="sm" variant="outline">
                        <Eye className="mr-2 h-4 w-4" /> Ver mais
                      </Button>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                          <FileDown className="mr-2 h-4 w-4" /> Baixar PDF
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Modelos</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => downloadChecklistPdfPrincipalById(c.id)}>
                          Principal (sem fotos)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => downloadChecklistPdfComImagensById(c.id)}>
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
                          <Button size="sm" variant="destructive" onClick={onDeleteConfirm}>
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setConfirmId(null); setConfirmText("") }}>
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setConfirmId(c.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Botão de entrada em formato BARRA larga no rodapé */}
      <div className="fixed left-0 right-0 mx-auto flex justify-center" style={{ bottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}>
        <Link href="/checklist" className="w-[92%] max-w-3xl">
          <Button className="w-full h-12 rounded-xl shadow-lg">Iniciar novo checklist</Button>
        </Link>
      </div>
    </main>
  )
}
