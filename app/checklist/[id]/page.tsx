"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { downloadChecklistPdfComImagens, downloadChecklistPdfPrincipal } from "@/lib/pdf"
import { getChecklist, type ChecklistStored } from "@/lib/storage"
import { ArrowLeft, FileDown, Plus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const StatusChip = ({ status }: { status: "conforme" | "nao_conforme" | "na" | null }) => {
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
  if (status === "conforme") return <span className={`${base} text-emerald-700 border-emerald-200 bg-emerald-50`}>Conforme</span>
  if (status === "nao_conforme") return <span className={`${base} text-rose-700 border-rose-200 bg-rose-50`}>Não conforme</span>
  if (status === "na") return <span className={`${base} text-amber-700 border-amber-200 bg-amber-50`}>N/A</span>
  return <span className={`${base} text-zinc-600 border-zinc-200 bg-zinc-50`}>Pendente</span>
}

function statusTintClasses(status: "conforme" | "nao_conforme" | "na" | null) {
  if (status === "conforme") return "border-emerald-200 bg-emerald-50/60"
  if (status === "nao_conforme") return "border-rose-200 bg-rose-50/60"
  if (status === "na") return "border-amber-200 bg-amber-50/60"
  return "border-zinc-200 bg-white"
}

function formatCreatedBadge(value: string | undefined | null) {
  if (!value) return "—"
  const m = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim())
  if (m) {
    const [, dd, mm, yyyy, HH, MM] = m
    return `${dd}/${mm}/${yyyy} ${HH}:${MM}`
  }
  const d = new Date(value)
  if (!isNaN(d.getTime())) {
    return d.toLocaleString("pt-BR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
  }
  return value
}

export default function ChecklistDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id || "")
  const [item, setItem] = useState<ChecklistStored | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const c = await getChecklist(id)
      if (active) {
        setItem(c)
        setLoading(false)
      }
    }
    if (id) load()
    return () => {
      active = false
    }
  }, [id])

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl p-4">
        <Button variant="outline" onClick={() => router.push("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Card className="mt-4">
          <CardContent className="p-4 text-sm text-zinc-600">Carregando…</CardContent>
        </Card>
      </main>
    )
  }

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
    <main
      className="mx-auto w-full max-w-3xl p-4 min-h-[100svh]"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 3.5rem)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Badge variant={item.completo ? "default" : "secondary"}>
          {item.completo ? "Completo" : "Incompleto"}
        </Badge>
      </div>

      <Card className="border-zinc-200">
        <CardHeader className="p-3">
          <CardTitle className="text-base">Resumo do Checklist</CardTitle>
          <div className="text-[11px] text-zinc-500">Criado em: {formatCreatedBadge(item.criadoEm)}</div>
        </CardHeader>
        <CardContent className="space-y-4 p-3">
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
                  <div
                    key={`${q.titulo}-${i}`}
                    className={`rounded-md border p-2 ${statusTintClasses(q.status as any)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm">{q.titulo}</div>
                        {q.detalhe && <div className="text-[11px] text-zinc-500">{q.detalhe}</div>}
                      </div>
                      <StatusChip status={q.status as any} />
                    </div>
                    {q.observacoes && (
                      <div className="mt-1 rounded bg-white/60 p-2 text-[11px] text-zinc-700">
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
                  <div
                    key={`${q.titulo}-${i}`}
                    className={`rounded-md border p-2 ${statusTintClasses(q.status as any)}`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm">{q.titulo}</div>
                      <StatusChip status={q.status as any} />
                    </div>
                    {q.observacoes && (
                      <div className="mb-2 rounded bg-white/60 p-2 text-[11px] text-zinc-700">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <FileDown className="mr-2 h-4 w-4" />
                  Baixar PDF
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Modelos</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => downloadChecklistPdfPrincipal(item)}>
                  Principal (sem fotos)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadChecklistPdfComImagens(item)}>
                  Secundário (com imagens)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

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
