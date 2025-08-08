"use client"

import jsPDF from "jspdf"
import type { ChecklistStored, Status } from "./storage"
import { getChecklist } from "./storage"

const PAGE = { W: 595, H: 842, M: 40, COL_GAP: 24 }
const COL_W = (PAGE.W - PAGE.M * 2 - PAGE.COL_GAP) / 2

const COLORS = {
  conforme: { r: 16, g: 185, b: 129 },
  nao_conforme: { r: 225, g: 29, b: 72 },
  na: { r: 245, g: 158, b: 11 },
  gray: { r: 51, g: 51, b: 51 },
}

function header(doc: jsPDF, pageNum: number, createdAt: string) {
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text("Checklist de Verificações BASELL", PAGE.M, 38)
  doc.setFontSize(10)
  doc.text("Relatório de Inspeção de Veículo", PAGE.M, 52)
  doc.setFont("helvetica", "normal")
  doc.text(`Página ${pageNum}`, PAGE.W - PAGE.M, 38, { align: "right" })
  doc.text(`Gerado em: ${createdAt}`, PAGE.W - PAGE.M, 52, { align: "right" })
}

function drawStatusBoxes(doc: jsPDF, x: number, y: number, selected: Status | null) {
  const box = 10
  const gap = 10
  const labelGap = 5
  let cx = x
  const map = [
    { key: "conforme" as const, label: "Conforme", color: COLORS.conforme },
    { key: "nao_conforme" as const, label: "Não conforme", color: COLORS.nao_conforme },
    { key: "na" as const, label: "N/A", color: COLORS.na },
  ]
  map.forEach((m) => {
    doc.setDrawColor(m.color.r, m.color.g, m.color.b)
    if (selected === m.key) {
      doc.setFillColor(m.color.r, m.color.g, m.color.b)
      doc.rect(cx, y - box + 2, box, box, "FD")
    } else {
      doc.rect(cx, y - box + 2, box, box, "S")
    }
    doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(m.label, cx + box + labelGap, y + 2)
    cx += box + labelGap + doc.getTextWidth(m.label) + gap
  })
}

function text(doc: jsPDF, str: string, x: number, y: number, size = 9, bold = false) {
  doc.setFont("helvetica", bold ? "bold" : "normal")
  doc.setFontSize(size)
  doc.text(str, x, y)
}

function truncated(str: string, max = 90) {
  if (!str) return ""
  return str.length > max ? str.slice(0, max - 1) + "…" : str
}

function hr(doc: jsPDF, y: number) {
  doc.setDrawColor(200, 200, 200)
  doc.line(PAGE.M, y, PAGE.W - PAGE.M, y)
}

function vehicleInfoTwoCols(doc: jsPDF, c: ChecklistStored, startY: number) {
  let y = startY
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text("Informações do Veículo:", PAGE.M, y)
  y += 12

  const leftX = PAGE.M
  const rightX = PAGE.M + COL_W + PAGE.COL_GAP

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  text(doc, `Marca: ${c.dadosIniciais?.marca || "—"}`, leftX, y)
  text(doc, `Modelo: ${c.dadosIniciais?.modelo || "—"}`, leftX, y + 12)
  text(doc, `Placa: ${c.dadosIniciais?.placa || "—"}`, rightX, y)
  text(doc, `Motorista: ${c.dadosIniciais?.motorista || "—"}`, rightX, y + 12)
  text(doc, `Inspetor(a): ${c.dadosIniciais?.inspetor || "—"}`, rightX, y + 24)

  return y + 32
}

function renderItemTwoCols(
  doc: jsPDF,
  y: number,
  it: { idx: number; titulo: string; detalhe?: string; status: Status | null; obs: string | null }
) {
  const leftX = PAGE.M
  const rightX = PAGE.M + COL_W + PAGE.COL_GAP

  text(doc, `${it.idx}. ${it.titulo}`, leftX, y, 9, true)
  let yNext = y + 12
  if (it.detalhe) {
    text(doc, `   ${truncated(String(it.detalhe), 80)}`, leftX, yNext, 8)
    yNext += 10
  }

  const obsLabel = "Observações:"
  const obsY = yNext + 4
  text(doc, obsLabel, leftX, obsY, 8)
  const obsStartX = leftX + doc.getTextWidth(obsLabel) + 4
  if (it.obs) {
    text(doc, truncated(String(it.obs), 100), obsStartX, obsY, 8)
  } else {
    doc.setDrawColor(180, 180, 180)
    doc.line(obsStartX, obsY - 2, PAGE.W - PAGE.M, obsY - 2)
  }

  drawStatusBoxes(doc, rightX, y + 10, it.status)

  const sepY = Math.max(obsY + 10, y + 34)
  hr(doc, sepY)
  return sepY + 10
}

async function loadImageData(input: string): Promise<{ kind: "data" | "element"; data: string | HTMLImageElement }> {
  if (input.startsWith("data:")) {
    return { kind: "data", data: input }
  }
  const img = new Image()
  img.crossOrigin = "anonymous"
  const done = new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
  })
  img.src = input
  const el = await done
  return { kind: "element", data: el }
}

/**
 * Modelo Principal: 1 página, sem fotos (gera com objeto provido).
 */
export function downloadChecklistPdfPrincipal(checklist: ChecklistStored) {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  let page = 1
  header(doc, page, checklist.criadoEm)

  let y = vehicleInfoTwoCols(doc, checklist, 70)
  text(doc, "ETAPA 1 - Verificações Básicas", PAGE.M, y, 10, true)
  y += 16

  const items = [
    ...((checklist.verificacoes || []).map((v, i) => ({ idx: i + 1, titulo: v.titulo, detalhe: v.detalhe, status: v.status as Status, obs: v.observacoes })) || []),
    ...((checklist.inspecoes || []).map((v, j) => ({ idx: (checklist.verificacoes || []).length + j + 1, titulo: v.titulo, detalhe: v.detalhe, status: v.status as Status, obs: v.observacoes })) || []),
  ]

  items.forEach((it) => { y = renderItemTwoCols(doc, y, it) })

  y += 6
  text(doc, "CONCLUSÃO", PAGE.M, y, 10, true); y += 14
  text(doc, "Assinaturas:", PAGE.M, y, 9); y += 16
  text(doc, "Inspetor: _________________________________", PAGE.M, y, 9); y += 14
  text(doc, "Motorista: ________________________________", PAGE.M, y, 9); y += 14
  text(doc, "Data: ___________  Hora: ___________", PAGE.M, y, 9)

  doc.save(`checklist-principal-${checklist.id}.pdf`)
}

/**
 * Secundário: com imagens, 3 colunas (gera com objeto provido).
 */
export async function downloadChecklistPdfComImagens(checklist: ChecklistStored) {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  let page = 1
  const maxPages = 3

  function newPage() {
    if (page >= maxPages) return false
    doc.addPage()
    page += 1
    header(doc, page, checklist.criadoEm)
    return true
  }

  header(doc, page, checklist.criadoEm)
  let y = vehicleInfoTwoCols(doc, checklist, 70)

  type Item = { idx: number; titulo: string; detalhe?: string; status: Status | null; obs: string | null; images: string[] }

  const items: Item[] = [
    ...((checklist.verificacoes || []).map((v, i) => ({ idx: i + 1, titulo: v.titulo, detalhe: v.detalhe, status: v.status as Status, obs: v.observacoes, images: [] })) || []),
    ...((checklist.inspecoes || []).map((v, j) => ({
      idx: (checklist.verificacoes || []).length + j + 1,
      titulo: v.titulo, detalhe: v.detalhe, status: v.status as Status, obs: v.observacoes,
      images: (v.midias || []).map((m) => m.dataUrl).filter(Boolean),
    })) || []),
  ]

  text(doc, "ETAPA 1 - Verificações Básicas", PAGE.M, y, 10, true)
  y += 16

  const COLS = 3
  const GAP = 10
  const G_W = PAGE.W - 2 * PAGE.M
  const IMG_W = Math.floor((G_W - GAP * (COLS - 1)) / COLS)
  const IMG_H = Math.round((IMG_W * 2) / 3)

  for (const it of items) {
    if (it.idx === 10 && page === 1) {
      if (!newPage()) break
      y = 70
      text(doc, "ETAPA 2 - Inspeções Visuais com Mídia", PAGE.M, y, 10, true)
      y += 16
    }

    if (y + 70 > PAGE.H - PAGE.M) {
      if (!newPage()) break
      y = 70
    }

    y = renderItemTwoCols(doc, y, it)

    if (it.images.length > 0) {
      let rowY = y + 4
      let col = 0

      for (let i = 0; i < Math.min(it.images.length, 12); i++) {
        const src = it.images[i]
        const x = PAGE.M + col * (IMG_W + GAP)
        const neededY = rowY + IMG_H

        if (neededY > PAGE.H - PAGE.M) {
          if (!newPage()) break
          rowY = 70
          col = 0
        }

        try {
          const img = await loadImageData(src)
          if (img.kind === "data") {
            doc.addImage(img.data as string, "JPEG", x, rowY, IMG_W, IMG_H)
          } else {
            doc.addImage(img.data as HTMLImageElement, "JPEG", x, rowY, IMG_W, IMG_H)
          }
        } catch {
          // ignore failed image
        }

        col++
        if (col >= COLS) {
          col = 0
          rowY = rowY + IMG_H + GAP
        }
      }

      if (col === 0) {
        y = rowY
      } else {
        y = rowY + IMG_H
      }
      hr(doc, y + 6)
      y += 16
    }
  }

  doc.save(`checklist-imagens-${checklist.id}.pdf`)
}

/**
 * Versões que BUSCAM o checklist do DB por id antes de gerar.
 */
export async function downloadChecklistPdfPrincipalById(id: string) {
  const c = await getChecklist(id)
  if (!c) throw new Error("Checklist não encontrado")
  return downloadChecklistPdfPrincipal(c)
}

export async function downloadChecklistPdfComImagensById(id: string) {
  const c = await getChecklist(id)
  if (!c) throw new Error("Checklist não encontrado")
  return downloadChecklistPdfComImagens(c)
}
