"use client"

import jsPDF from "jspdf"
import type { ChecklistStored } from "./storage"

export function downloadChecklistPdf(checklist: ChecklistStored) {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const line = (y: number) => {
    doc.setDrawColor(220, 220, 220)
    doc.line(40, y, 555, y)
  }
  let y = 40

  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text(`Checklist: ${checklist.titulo}`, 40, y)
  y += 20

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`ID: ${checklist.id}`, 40, y); y += 14
  doc.text(`Criado em: ${checklist.criadoEm}`, 40, y); y += 20
  line(y); y += 16

  doc.setFont("helvetica", "bold")
  doc.text("Dados Iniciais", 40, y); y += 14
  doc.setFont("helvetica", "normal")
  doc.text(`Placa: ${checklist.dadosIniciais.placa}`, 40, y); y += 12
  doc.text(`Motorista: ${checklist.dadosIniciais.motorista}`, 40, y); y += 12
  doc.text(`Inspetor: ${checklist.dadosIniciais.inspetor}`, 40, y); y += 12
  doc.text(`Marca: ${checklist.dadosIniciais.marca}`, 40, y); y += 12
  doc.text(`Modelo: ${checklist.dadosIniciais.modelo}`, 40, y); y += 20
  line(y); y += 16

  doc.setFont("helvetica", "bold")
  doc.text("Verificações (Etapa 2)", 40, y); y += 14
  doc.setFont("helvetica", "normal")
  checklist.verificacoes.forEach((v) => {
    if (y > 770) { doc.addPage(); y = 40 }
    doc.text(`${v.titulo} - Status: ${v.status ?? "Pendente"}`, 40, y); y += 12
    if (v.detalhe) { doc.text(`  Detalhe: ${v.detalhe}`, 40, y); y += 12 }
    if (v.observacoes) { doc.text(`  Obs.: ${v.observacoes}`, 40, y); y += 12 }
  })
  y += 12
  line(y); y += 16

  doc.setFont("helvetica", "bold")
  doc.text("Inspeções (Etapa 3)", 40, y); y += 14
  doc.setFont("helvetica", "normal")
  checklist.inspecoes.forEach((i) => {
    if (y > 770) { doc.addPage(); y = 40 }
    doc.text(`${i.titulo} - Status: ${i.status ?? "Pendente"}`, 40, y); y += 12
    if (i.detalhe) { doc.text(`  Detalhe: ${i.detalhe}`, 40, y); y += 12 }
    if (i.observacoes) { doc.text(`  Obs.: ${i.observacoes}`, 40, y); y += 12 }
    // Não vamos inserir imagens para manter "sem modelo" e rápido; atende "pelo menos os valores"
  })

  doc.save(`checklist-${checklist.id}.pdf`)
}
