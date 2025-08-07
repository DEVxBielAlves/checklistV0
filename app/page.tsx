"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { deleteChecklist, listChecklists, type ChecklistStored } from "@/lib/storage"
import { downloadChecklistPdf } from "@/lib/pdf"
import { Eye, FileDown, Plus, Trash2 } from 'lucide-react'

export default function HomePage() {
  const { toast } = useToast()
  const [items, setItems] = useState<ChecklistStored[]>([])
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState("")

  useEffect(() => {
    setItems(listChecklists())
  }, [])

  function refresh() {
    setItems(listChecklists())
  }

  function handleDelete(id: string) {
    deleteChecklist(id)
    toast({ title: "Checklist excluído" })
    setConfirmId(null)
    setConfirmText("")
    refresh()
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-4">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">Checklist Basel</h1>
        <p className="text-xs text-zinc-500">Histórico de checklists</p>
      </header>

      <div className="grid gap-3">
        {items.length === 0 && (
          <Card>
            <CardContent className="p-4 text-sm text-zinc-600">
              Nenhum checklist salvo ainda. Toque no botão “+” para iniciar um checklist.
            </CardContent>
          </Card>
        )}

        {items.map((c) => (
          <Card key={c.id} className="border-zinc-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{c.titulo}</span>
                <Badge variant={c.completo ? "default" : "secondary"}>{c.completo ? "Completo" : "Incompleto"}</Badge>
              </CardTitle>
              <div className="text-[11px] text-zinc-500">Criado em: {c.criadoEm}</div>
            </CardHeader>
            <CardContent className="grid gap-1 text-xs text-zinc-700">
              <div>Placa: {c.dadosIniciais.placa}</div>
              <div className="grid grid-cols-2 gap-2">
                <div>Motorista: {c.dadosIniciais.motorista}</div>
                <div>Inspetor: {c.dadosIniciais.inspetor}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>Marca: {c.dadosIniciais.marca}</div>
                <div>Modelo: {c.dadosIniciais.modelo}</div>
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <Link href={`/checklist/${c.id}`} className="inline-flex">
                  <Button variant="outline" size="sm">
                    <Eye className="mr-2 h-4 w-4" />
                    Ver mais
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadChecklistPdf(c)}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </div>

              <Dialog open={confirmId === c.id} onOpenChange={(open) => { if (!open) { setConfirmId(null); setConfirmText("") }}}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm" onClick={() => setConfirmId(c.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmar exclusão</DialogTitle>
                    <DialogDescription>
                      Digite <span className="font-semibold">delete</span> para confirmar a exclusão do checklist.
                    </DialogDescription>
                  </DialogHeader>
                  <Input
                    autoFocus
                    placeholder="Digite delete"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                  />
                  <DialogFooter>
                    <Button
                      variant="destructive"
                      disabled={confirmText !== "delete"}
                      onClick={() => handleDelete(c.id)}
                    >
                      Confirmar exclusão
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Botão flutuante para novo checklist */}
      <Link href="/checklist" className="fixed bottom-4 right-4">
        <Button className="rounded-full h-12 w-12 p-0 shadow-lg">
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
    </main>
  )
}
