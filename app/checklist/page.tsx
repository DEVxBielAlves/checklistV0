"use client"

import type React from "react"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import {
  AlertTriangle,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileImage,
  Info,
  Plus,
  Trash2,
} from "lucide-react"
import CameraCapture from "@/components/camera-capture"
import { saveChecklist, type ChecklistStored } from "@/lib/storage"

type Status = "conforme" | "nao_conforme" | "na"
type Step = 1 | 2 | 3 | 4

type Step2Item = { titulo: string; detalhe?: string }
type Step2Answer = { status: Status | null; observacoes: string }
type Step3Item = { titulo: string; detalhe?: string }
type MediaItem = { id: string; file: File; url: string; kind: "image"; dataUrl: string }
type Step3Answer = { status: Status | null; observacoes: string; midias: MediaItem[] }

const SECAO_FRONTAL: Step2Item[] = [
  { titulo: "Dianteiro amassado", detalhe: "Verificação de danos na parte dianteira do veículo" },
  { titulo: "Levanta fio", detalhe: "Inspeção do sistema levanta fio" },
  { titulo: "Frontal da carreta amassada", detalhe: "Verificação de danos na parte frontal da carreta" },
]

const SECAO_TRASEIRA: Step2Item[] = [
  { titulo: "Lanternas queimadas", detalhe: "Verificação de lanternas queimadas" },
  { titulo: "Lanternas quebradas", detalhe: "Inspeção de lanternas quebradas ou danificadas" },
  { titulo: "Batente de porta em boas condições", detalhe: "Verificação do estado dos batentes das portas" },
  {
    titulo: "Faixa refletiva do para-choque em boas condições",
    detalhe: "Inspeção das faixas refletivas do para-choque",
  },
  { titulo: "Traseira amassada", detalhe: "Verificação de danos na parte traseira" },
]

const STEP2_QUESTOES: Step2Item[] = [...SECAO_FRONTAL, ...SECAO_TRASEIRA]

const STEP3_INSPECOES: Step3Item[] = [
  { titulo: "Foto Seção Frontal", detalhe: "Documentação fotográfica obrigatória da seção frontal" },
  { titulo: "Foto Seção Traseira", detalhe: "Documentação fotográfica obrigatória da seção traseira" },
]

function formatDateDDMMYYYY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0")
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const yyyy = String(date.getFullYear())
  const HH = String(date.getHours()).padStart(2, "0")
  const MM = String(date.getMinutes()).padStart(2, "0")
  const SS = String(date.getSeconds()).padStart(2, "0")
  return `${dd}-${mm}-${yyyy}  ${HH}:${MM}:${SS}`
}

function validatePlaca(placa: string): boolean {
  const up = placa.toUpperCase().trim()
  const regex1 = /^[A-Z]{3}-\d{4}$/
  const regex2 = /^[A-Z]{3}\d{4}$/
  return regex1.test(up) || regex2.test(up)
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function StatusButtons({
  value = null,
  onChange = () => {},
}: {
  value?: Status | null
  onChange?: (v: Status) => void
}) {
  const base =
    "flex-1 rounded-xl px-3 py-3 text-sm font-semibold transition-all active:scale-[0.98] focus-visible:outline-none ring-2 ring-transparent border bg-gradient-to-b from-white/5 to-white/0 backdrop-blur"
  return (
    <div className="grid grid-cols-3 gap-2">
      <button
        type="button"
        aria-pressed={value === "conforme"}
        onClick={() => onChange("conforme")}
        className={cx(
          base,
          value === "conforme"
            ? "bg-emerald-500/20 text-emerald-900 ring-emerald-400 border-emerald-400/30 shadow-[inset_0_1px_0_rgba(255,255,255,.2)]"
            : "bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-700 border-emerald-500/20",
        )}
      >
        Conforme
      </button>
      <button
        type="button"
        aria-pressed={value === "nao_conforme"}
        onClick={() => onChange("nao_conforme")}
        className={cx(
          base,
          value === "nao_conforme"
            ? "bg-rose-500/20 text-rose-900 ring-rose-400 border-rose-400/30 shadow-[inset_0_1px_0_rgba(255,255,255,.2)]"
            : "bg-rose-500/10 hover:bg-rose-500/15 text-rose-700 border-rose-500/20",
        )}
      >
        Não conforme
      </button>
      <button
        type="button"
        aria-pressed={value === "na"}
        onClick={() => onChange("na")}
        className={cx(
          base,
          value === "na"
            ? "bg-amber-500/20 text-amber-900 ring-amber-400 border-amber-400/30 shadow-[inset_0_1px_0_rgba(255,255,255,.2)]"
            : "bg-amber-500/10 hover:bg-amber-500/15 text-amber-700 border-amber-500/20",
        )}
      >
        N/A
      </button>
    </div>
  )
}

function StepIndicator({ step = 1 }: { step?: Step }) {
  const steps = [
    { id: 1, label: "Dados" },
    { id: 2, label: "Verificações" },
    { id: 3, label: "Inspeções" },
    { id: 4, label: "Revisão" },
  ]
  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {steps.map((s, i) => {
        const active = step === (s.id as Step)
        const done = (s.id as number) < step
        return (
          <div key={s.id} className="flex items-center">
            <div
              className={cx(
                "flex items-center gap-2 rounded-full px-3 py-1 text-xs border",
                active && "bg-zinc-900 text-white border-zinc-900",
                done && "bg-zinc-100 text-zinc-700 border-zinc-200",
                !active && !done && "bg-white text-zinc-600 border-zinc-200",
              )}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span>{`Etapa ${s.id}: ${s.label}`}</span>
            </div>
            {i < steps.length - 1 && <ChevronRight className="mx-1 h-4 w-4 text-zinc-400 shrink-0" />}
          </div>
        )
      })}
    </div>
  )
}

export default function ChecklistPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState<Step>(1)
  const [isSaving, setIsSaving] = useState(false)

  // Etapa 1
  const [placa, setPlaca] = useState("")
  const [motorista, setMotorista] = useState("")
  const [inspetor, setInspetor] = useState("")
  const [quilometragem, setQuilometragem] = useState("")
  const [createdAt, setCreatedAt] = useState<string>("")
  const createdRef = useRef<Date | null>(null)

  useEffect(() => {
    if (!createdRef.current) {
      createdRef.current = new Date()
      setCreatedAt(formatDateDDMMYYYY(createdRef.current))
    }
  }, [])

  // Etapa 2
  const [step2, setStep2] = useState<Step2Answer[]>(STEP2_QUESTOES.map(() => ({ status: null, observacoes: "" })))

  // Etapa 3
  const [step3, setStep3] = useState<Step3Answer[]>(
    STEP3_INSPECOES.map(() => ({ status: null, observacoes: "", midias: [] })),
  )

  const s2Refs = useRef<Array<HTMLDivElement | null>>([])
  const s3Refs = useRef<Array<HTMLDivElement | null>>([])

  function scrollToNext(refs: React.MutableRefObject<Array<HTMLDivElement | null>>, idx: number) {
    const nextEl = refs.current[idx + 1]
    if (nextEl) {
      nextEl.scrollIntoView({ behavior: "smooth", block: "start" })
      setTimeout(() => window.scrollBy({ top: -64, behavior: "smooth" }), 200)
    } else {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })
    }
  }

  useEffect(() => {
    return () => {
      step3.forEach((ans) => ans.midias.forEach((m) => URL.revokeObjectURL(m.url)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function isStep3ItemComplete(a: Step3Answer): boolean {
    if (!a.status) return false
    if (a.status === "na") return true
    if (a.status === "conforme") return a.midias.length >= 1
    if (a.status === "nao_conforme") return a.midias.length >= 1 && a.observacoes.trim().length > 0
    return false
  }

  const totalItems = STEP2_QUESTOES.length + STEP3_INSPECOES.length
  const answeredCount = step2.filter((i) => i.status !== null).length + step3.filter(isStep3ItemComplete).length
  const overallProgress = Math.round((answeredCount / totalItems) * 100)

  function validateStep1(): boolean {
    return motorista.trim().length > 0 && inspetor.trim().length > 0 && validatePlaca(placa) && quilometragem.length > 0
  }
  function validateStep2(): boolean {
    return step2.every((i) => i.status !== null)
  }
  function validateStep3(): boolean {
    return step3.every(isStep3ItemComplete)
  }
  function validateChecklist(): boolean {
    return validateStep1() && validateStep2() && validateStep3()
  }

  function handleNext() {
    if (step === 1 && !validateStep1()) {
      toast({
        title: "Complete os dados obrigatórios.",
        description: "Verifique placa, motorista, inspetor e quilometragem.",
        variant: "destructive",
      })
      return
    }
    if (step === 2 && !validateStep2()) {
      toast({
        title: "Responda todas as verificações.",
        description: "Selecione um status para cada item da Etapa 2.",
        variant: "destructive",
      })
      return
    }
    if (step === 3 && !validateStep3()) {
      toast({
        title: "Requisitos da Etapa 3 não atendidos.",
        description: "N/A não exige foto; Não conforme exige foto e observação; Conforme exige foto.",
        variant: "destructive",
      })
      return
    }
    setStep((s) => Math.min((s + 1) as Step, 4))
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50)
  }

  function handleBack() {
    setStep((s) => Math.max((s - 1) as Step, 1))
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50)
  }

  function blobToFile(blob: Blob, filename: string): File {
    return new File([blob], filename, { type: "image/jpeg", lastModified: Date.now() })
  }

  function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  async function addCapturedImage(index: number, blob: Blob) {
    const file = blobToFile(blob, `captura-${Date.now()}.jpg`)
    const url = URL.createObjectURL(blob)
    const dataUrl = await blobToDataUrl(blob)
    const item: MediaItem = { id: `${Date.now()}-${Math.random()}`, file, url, dataUrl, kind: "image" }
    setStep3((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], midias: [...next[index].midias, item] }
      return next
    })
  }

  function removeMidia(index: number, mediaId: string) {
    setStep3((prev) => {
      const next = [...prev]
      const toRemove = next[index].midias.find((m) => m.id === mediaId)
      if (toRemove) URL.revokeObjectURL(toRemove.url)
      next[index] = { ...next[index], midias: next[index].midias.filter((m) => m.id !== mediaId) }
      return next
    })
  }

  const checklistJSON = useMemo(() => {
    return {
      titulo: "Checklist Basel",
      criadoEm: createdAt,
      dadosIniciais: { placa, motorista, inspetor, quilometragem },
      verificacoes: STEP2_QUESTOES.map((q, i) => ({
        titulo: q.titulo,
        detalhe: q.detalhe,
        status: step2[i].status,
        observacoes: step2[i].observacoes || null,
      })),
      inspecoes: STEP3_INSPECOES.map((q, i) => ({
        titulo: q.titulo,
        detalhe: q.detalhe,
        status: step3[i].status,
        observacoes: step3[i].observacoes || null,
        midias: step3[i].midias.map((m) => ({
          nome: m.file.name,
          tipo: m.file.type,
          tamanho: m.file.size,
          kind: m.kind,
          dataUrl: m.dataUrl,
        })),
      })),
      completo: validateChecklist(),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placa, motorista, inspetor, quilometragem, createdAt, step2, step3])

  function generateId() {
    return Math.random().toString(36).slice(2, 10)
  }

  async function concluirChecklist() {
    if (!validateChecklist()) {
      toast({
        title: "Checklist incompleto",
        description: "N/A sem foto; Não conforme com foto e observação; Conforme com foto.",
        variant: "destructive",
      })
      return
    }
    const record: ChecklistStored = { id: generateId(), ...checklistJSON } as ChecklistStored
    try {
      setIsSaving(true)
      await saveChecklist(record) // envia ao /api/checklists e persiste no Supabase
      toast({ title: "Checklist salvo com sucesso no banco de dados" })
      // navegar após salvar
      // aguarda a transição de rota para não perder o toast (opcional)
      // você pode remover o setTimeout se preferir navegação imediata
      setTimeout(() => {
        router.push("/")
      }, 150)
    } catch (e: any) {
      toast({
        title: "Falha ao salvar no Supabase",
        description: e?.message || "Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const statusBadge = (s: Status | null) => {
    if (!s) return <Badge variant="outline">Pendente</Badge>
    if (s === "conforme") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Conforme</Badge>
    if (s === "nao_conforme") return <Badge className="bg-rose-600 hover:bg-rose-600">Não conforme</Badge>
    return <Badge className="bg-amber-500 hover:bg-amber-500">N/A</Badge>
  }

  return (
    <main
      className="mx-auto w-full max-w-3xl p-4 min-h-[100svh]"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 5rem)" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Checklist Basel</h1>
          <p className="text-xs text-zinc-500">Mobile-first • Interface moderna e profissional</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {createdAt || "—"}
          </Badge>
        </div>
      </div>

      <div className="mb-3">
        <StepIndicator step={step} />
      </div>

      <div className="mb-4">
        <Progress value={overallProgress} className="h-2" />
        <div className="mt-1 text-[10px] text-zinc-500">
          {answeredCount} de {totalItems} itens completos
        </div>
      </div>

      {step === 1 && (
        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">Etapa 1: Dados iniciais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="placa">Placa do veículo</Label>
                <Input
                  id="placa"
                  inputMode="text"
                  autoCapitalize="characters"
                  placeholder="AAA-0000 ou ABC1234"
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                  className={cx(!placa || validatePlaca(placa) ? "" : "border-rose-500")}
                />
                {!!placa && !validatePlaca(placa) && (
                  <p className="text-xs text-rose-600">Formato inválido. Use AAA-0000 ou ABC1234.</p>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="motorista">Nome do motorista</Label>
                <Input
                  id="motorista"
                  placeholder="Digite o nome"
                  value={motorista}
                  onChange={(e) => setMotorista(e.target.value)}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="inspetor">Nome do vistoriador/inspetor</Label>
                <Input
                  id="inspetor"
                  placeholder="Digite o nome"
                  value={inspetor}
                  onChange={(e) => setInspetor(e.target.value)}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="quilometragem">Quilometragem inicial</Label>
                <Input
                  id="quilometragem"
                  type="number"
                  placeholder="Digite a quilometragem"
                  value={quilometragem}
                  onChange={(e) => setQuilometragem(e.target.value)}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="data">Data e hora</Label>
                <Input id="data" value={createdAt} readOnly />
                <p className="text-[10px] text-zinc-500">Gerado automaticamente. Formato: dd-mm-yyyy HH:mm:ss</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">Etapa 2: Verificações (9 itens)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {STEP2_QUESTOES.map((q, idx) => {
              const a = step2[idx]
              return (
                <div
                  key={q.titulo}
                  className="rounded-lg border p-3 scroll-mt-24"
                  ref={(el) => (s2Refs.current[idx] = el)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{q.titulo}</div>
                      {q.detalhe && <div className="text-xs text-zinc-500">{q.detalhe}</div>}
                    </div>
                    {statusBadge(a.status)}
                  </div>
                  <div className="mt-2">
                    <StatusButtons
                      value={a.status}
                      onChange={(v) => {
                        setStep2((prev) => {
                          const next = [...prev]
                          next[idx] = { ...next[idx], status: v }
                          return next
                        })
                      }}
                    />
                  </div>
                  <div className="mt-2">
                    <Label htmlFor={`obs2-${idx}`} className="text-xs">
                      Observações (opcional)
                    </Label>
                    <Textarea
                      id={`obs2-${idx}`}
                      placeholder="Adicione observações, se necessário"
                      value={a.observacoes}
                      onChange={(e) =>
                        setStep2((prev) => {
                          const next = [...prev]
                          next[idx] = { ...next[idx], observacoes: e.target.value }
                          return next
                        })
                      }
                      className="min-h-[72px]"
                    />
                  </div>
                </div>
              )
            })}
            {!validateStep2() && (
              <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-xs">Selecione um status para todos os itens antes de continuar.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">Etapa 3: Inspeções detalhadas (somente câmera)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {STEP3_INSPECOES.map((q, idx) => {
              const a = step3[idx]
              const hasMedia = a.midias.length > 0
              const status = a.status
              const requiresObs = status === "nao_conforme"
              const requiresMedia = (status === "conforme" && !hasMedia) || (status === "nao_conforme" && !hasMedia)
              const minPhotos = status === "na" ? 0 : 1

              return (
                <div
                  key={q.titulo}
                  className="rounded-lg border p-3 scroll-mt-24"
                  ref={(el) => (s3Refs.current[idx] = el)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{q.titulo}</div>
                      {q.detalhe && <div className="text-xs text-zinc-500">{q.detalhe}</div>}
                    </div>
                    {statusBadge(a.status)}
                  </div>

                  <div className="mt-2">
                    <StatusButtons
                      value={a.status}
                      onChange={(v) => {
                        setStep3((prev) => {
                          const next = [...prev]
                          next[idx] = { ...next[idx], status: v }
                          return next
                        })
                      }}
                    />
                  </div>

                  <div className="mt-3 space-y-2">
                    <Label className="text-xs">
                      Captura de fotos {status === "na" ? "(opcional para N/A)" : "(mínimo 1 exigido)"}
                    </Label>
                    <div className="flex flex-col gap-2">
                      <CameraCapture
                        title="Câmera integrada"
                        onCapture={(blob) => addCapturedImage(idx, blob)}
                        facingMode="environment"
                        quality={0.9}
                        takenCount={a.midias.length}
                        requiredCount={minPhotos}
                      />
                      {requiresMedia && (
                        <div className="flex items-center gap-2 text-[11px] text-amber-700">
                          <Info className="h-3.5 w-3.5" />
                          {status === "nao_conforme"
                            ? "Para 'Não conforme' a foto é obrigatória."
                            : "Para 'Conforme' inclua pelo menos 1 foto."}
                        </div>
                      )}
                    </div>

                    {a.midias.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {a.midias.map((m) => (
                          <div key={m.id} className="group relative overflow-hidden rounded-md border">
                            <img
                              src={m.url || "/placeholder.svg?height=96&width=160&query=captura"}
                              alt={m.file.name}
                              className="h-24 w-full object-cover"
                              crossOrigin="anonymous"
                            />
                            <button
                              type="button"
                              aria-label="Remover mídia"
                              onClick={() => removeMidia(idx, m.id)}
                              className="absolute right-1 top-1 rounded-full bg-white/90 p-1 shadow hover:bg-white"
                            >
                              <Trash2 className="h-4 w-4 text-rose-600" />
                            </button>
                            <div className="absolute left-1 top-1 flex items-center gap-1 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                              <FileImage className="h-3.5 w-3.5" />
                              <span>IMG</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <Label htmlFor={`obs3-${idx}`} className="text-xs">
                      Observações {requiresObs ? "(obrigatório para Não conforme)" : "(opcional)"}
                    </Label>
                    <Textarea
                      id={`obs3-${idx}`}
                      placeholder={
                        requiresObs ? "Obrigatório para Não conforme" : "Adicione observações, se necessário"
                      }
                      value={a.observacoes}
                      onChange={(e) =>
                        setStep3((prev) => {
                          const next = [...prev]
                          next[idx] = { ...next[idx], observacoes: e.target.value }
                          return next
                        })
                      }
                      className={cx(
                        "min-h-[72px]",
                        requiresObs && a.observacoes.trim().length === 0 ? "border-rose-500" : "",
                      )}
                    />
                  </div>

                  {(!a.status || !isStep3ItemComplete(a)) && (
                    <div className="mt-2 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-800">
                      <AlertTriangle className="h-4 w-4" />
                      <p className="text-xs">
                        {a.status
                          ? a.status === "na"
                            ? "N/A selecionado: foto opcional."
                            : a.status === "nao_conforme"
                              ? "Necessário: pelo menos 1 foto e observação."
                              : "Necessário: pelo menos 1 foto."
                          : "Selecione um status para continuar."}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">Etapa 4: Revisão final</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border">
              <div className="p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-medium">Resumo geral</div>
                </div>
                <Separator />
                <div className="mt-2 grid gap-2 text-xs text-zinc-700">
                  <div>
                    <span className="font-medium">Placa: </span>
                    <span>{placa || "—"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-medium">Motorista: </span>
                      <span>{motorista || "—"}</span>
                    </div>
                    <div>
                      <span className="font-medium">Inspetor: </span>
                      <span>{inspetor || "—"}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-medium">Quilometragem inicial: </span>
                      <span>{quilometragem || "—"}</span>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Criado em: </span>
                    <span>{createdAt || "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md border">
              <div className="p-3">
                <div className="mb-2 text-sm font-medium">Verificações (Etapa 2)</div>
                <div className="grid gap-2">
                  {STEP2_QUESTOES.map((q, i) => (
                    <div key={q.titulo} className="rounded-md border p-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm">{q.titulo}</div>
                          {q.detalhe && <div className="text-[11px] text-zinc-500">{q.detalhe}</div>}
                        </div>
                        {statusBadge(step2[i].status)}
                      </div>
                      {step2[i].observacoes && (
                        <div className="mt-1 rounded bg-zinc-50 p-2 text-[11px] text-zinc-700">
                          <span className="font-medium">Obs.: </span>
                          {step2[i].observacoes}
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
                  {STEP3_INSPECOES.map((q, i) => (
                    <div key={q.titulo} className="rounded-md border p-2">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm">{q.titulo}</div>
                        {statusBadge(step3[i].status)}
                      </div>
                      {step3[i].observacoes && (
                        <div className="mb-2 rounded bg-zinc-50 p-2 text-[11px] text-zinc-700">
                          <span className="font-medium">Obs.: </span>
                          {step3[i].observacoes}
                        </div>
                      )}
                      {step3[i].midias.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {step3[i].midias.map((m) => (
                            <div key={m.id} className="relative overflow-hidden rounded-md border">
                              <img
                                src={m.url || "/placeholder.svg?height=96&width=160&query=revisao-foto"}
                                alt={m.file.name}
                                className="h-24 w-full object-cover"
                                crossOrigin="anonymous"
                              />
                              <div className="absolute left-1 top-1 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                                IMG
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-md border border-dashed p-2 text-[11px] text-zinc-500">
                          <Camera className="h-4 w-4" />
                          {step3[i].status === "na" ? "N/A: foto não necessária." : "Sem fotos."}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {!validateChecklist() && (
              <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-xs">
                  Checklist incompleto. Regras: N/A sem foto; Não conforme com foto e observação; Conforme com foto.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="sticky mt-4" style={{ bottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}>
        <div className="rounded-xl border bg-white p-2 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" onClick={handleBack} disabled={step === 1}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[11px]">
                {createdAt || "—"}
              </Badge>
            </div>
            {step < 4 ? (
              <Button onClick={handleNext}>
                Avançar <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={concluirChecklist} disabled={!validateChecklist() || isSaving}>
                <Check className="mr-2 h-4 w-4" />
                {isSaving ? "Salvando..." : "Salvar e finalizar"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Link href="/" className="fixed right-4" style={{ bottom: "max(env(safe-area-inset-bottom), 1rem)" }}>
        <Button variant="outline" className="rounded-full h-12 w-12 p-0 shadow-lg bg-transparent">
          <Plus className="h-6 w-6 rotate-45" />
        </Button>
      </Link>
    </main>
  )
}
