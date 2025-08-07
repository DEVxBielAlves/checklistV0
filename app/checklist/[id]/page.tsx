"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { downloadChecklistPdf } from "@/lib/pdf"
import { deleteChecklist, getChecklist, type ChecklistStored } from "@/lib/storage"
import { ArrowLeft, FileDown, Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

export default function ChecklistDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const id = String(params?.id || "")
  const [item, setItem] = useState<ChecklistStored | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")

  useEffect(() => {
    setItem(getChecklist(id))
  }, [id])

  if (!item) {
    return (
      <main className="mx-auto w-full max-w-3xl p-4">
        <Button variant="outline" onClick={() => router.push("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Card className="mt-4">
          <CardContent className="p-4 text-sm text-zinc-600">Checklist não encontrado.</CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Badge variant={item.completo ? "default" : "secondary"}>{item.completo ? "Completo" : "Incompleto"}</Badge>
      </div>

      <Card className="border-zinc-200">
        <CardHeader>
          <CardTitle className="text-base">Resumo do Checklist</CardTitle>
          <div className="text-[11px] text-zinc-500">Criado em: {item.criadoEm}</div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border">
            <div className="p-3 grid gap-2 text-xs text-zinc-700">
              <div>
                <span className="font-medium">Placa: </span>
                <span>{item.dadosIniciais.placa}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">Motorista: </span>
                  <span>{item.dadosIniciais.motorista}</span>
                </div>
                <div>
                  <span className="font-medium">Inspetor: </span>
                  <span>{item.dadosIniciais.inspetor}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">Marca: </span>
                  <span>{item.dadosIniciais.marca}</span>
                </div>
                <div>
                  <span className="font-medium">Modelo: </span>
                  <span>{item.dadosIniciais.modelo}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-md border">
            <div className="p-3">
              <div className="mb-2 text-sm font-medium">Verificações (Etapa 2)</div>
              <div className="grid gap-2">
                {item.verificacoes.map((q, i) => (
                  <div key={`${q.titulo}-${i}`} className="rounded-md border p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm">{q.titulo}</div>
                        {q.detalhe && <div className="text-[11px] text-zinc-500">{q.detalhe}</div>}
                      </div>
                      <Badge variant="secondary">{q.status ?? "Pendente"}</Badge>
                    </div>
                    {q.observacoes && (
                      <div className="mt-1 rounded bg-zinc-50 p-2 text-[11px] text-zinc-700">
                        <span className="font-medium">Obs.: </span>
                        {q.observacoes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-md border">
            <div className="p-3">
              <div className="mb-2 text-sm font-medium">Inspeções (Etapa 3)</div>
              <div className="grid gap-3">
                {item.inspecoes.map((q, i) => (
                  <div key={`${q.titulo}-${i}`} className="rounded-md border p-2">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm">{q.titulo}</div>
                      <Badge variant="secondary">{q.status ?? "Pendente"}</Badge>
                    </div>
                    {q.observacoes && (
                      <div className="mb-2 rounded bg-zinc-50 p-2 text-[11px] text-zinc-700">
                        <span className="font-medium">Obs.: </span>
                        {q.observacoes}
                      </div>
                    )}
                    {q.midias.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {q.midias.map((m, idx) => (
                          <div key={`${m.nome}-${idx}`} className="relative overflow-hidden rounded-md border">
                            <img
                              src={m.dataUrl || "/placeholder.svg?height=96&width=160&query=inspecao-foto"}
                              alt={m.nome}
                              className="h-24 w-full object-cover"
                              crossOrigin="anonymous"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-zinc-500">Sem fotos.</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" onClick={() => downloadChecklistPdf(item)}>
              <FileDown className="mr-2 h-4 w-4" />
              Download PDF
            </Button>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">
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
                    onClick={() => {
                      deleteChecklist(item.id)
                      toast({ title: "Checklist excluído" })
                      router.push("/")
                    }}
                  >
                    Confirmar exclusão
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Botão flutuante para novo checklist */}
      <Link href="/checklist" className="fixed bottom-4 right-4">
        <Button className="rounded-full h-12 w-12 p-0 shadow-lg">
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
    </main>
  )
}
