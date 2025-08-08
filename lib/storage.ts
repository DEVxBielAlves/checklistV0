"use client";

import { getSupabaseClient } from "./supabase";

export type Status = "conforme" | "nao_conforme" | "na";

export type Step2Entry = {
  titulo: string;
  detalhe?: string;
  status: Status | null;
  observacoes: string | null;
};

export type Step3MediaStored = {
  nome: string;
  tipo: string;
  tamanho: number;
  kind: "image";
  dataUrl: string;
};

export type Step3Entry = {
  titulo: string;
  detalhe?: string;
  status: Status | null;
  observacoes: string | null;
  midias: Step3MediaStored[];
};

export type ChecklistStored = {
  id: string;
  titulo: string;
  criadoEm: string; // dd-mm-yyyy  HH:mm:ss
  dadosIniciais: {
    placa: string;
    motorista: string;
    inspetor: string;
    marca: string;
    modelo: string;
  };
  verificacoes: Step2Entry[];
  inspecoes: Step3Entry[];
  completo: boolean;
};

type DbChecklistRow = {
  id: string;
  titulo: string;
  criado_em: string | null;
  placa: string;
  motorista: string;
  inspetor: string;
  marca: string;
  modelo: string;
  completo: boolean;
  created_at: string;
};

type DbVerificacaoRow = {
  id: number;
  checklist_id: string;
  ordem: number;
  titulo: string;
  detalhe: string | null;
  status: Status | null;
  observacoes: string | null;
};

type DbInspecaoRow = {
  id: number;
  checklist_id: string;
  ordem: number;
  titulo: string;
  detalhe: string | null;
  status: Status | null;
  observacoes: string | null;
};

type DbMidiaRow = {
  id: number;
  inspecao_id: number;
  nome: string;
  tipo: string;
  tamanho: number;
  kind: "image";
  data_url: string;
};

function formatDateDDMMYYYY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  const HH = String(date.getHours()).padStart(2, "0");
  const MM = String(date.getMinutes()).padStart(2, "0");
  const SS = String(date.getSeconds()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy}  ${HH}:${MM}:${SS}`;
}

function toChecklistSummary(row: DbChecklistRow): ChecklistStored {
  const created = row.criado_em
    ? new Date(row.criado_em)
    : new Date(row.created_at);
  return {
    id: row.id,
    titulo: row.titulo || "Checklist Basel",
    criadoEm: formatDateDDMMYYYY(created),
    dadosIniciais: {
      placa: row.placa,
      motorista: row.motorista,
      inspetor: row.inspetor,
      marca: row.marca,
      modelo: row.modelo,
    },
    verificacoes: [],
    inspecoes: [],
    completo: row.completo,
  };
}

export async function listChecklists(): Promise<ChecklistStored[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("checklists")
    .select("*")
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data as DbChecklistRow[]).map(toChecklistSummary);
}

export async function saveChecklist(record: ChecklistStored): Promise<void> {
  const supabase = getSupabaseClient();

  // Inserir checklist principal
  const { error: insErr } = await supabase.from("checklists").insert({
    id: record.id,
    titulo: record.titulo,
    placa: record.dadosIniciais.placa,
    motorista: record.dadosIniciais.motorista,
    inspetor: record.dadosIniciais.inspetor,
    marca: record.dadosIniciais.marca,
    modelo: record.dadosIniciais.modelo,
    completo: record.completo,
  });
  if (insErr) throw insErr;

  // Inserir verificações (Etapa 2)
  if (record.verificacoes?.length) {
    const verificaRows = record.verificacoes.map((v, idx) => ({
      checklist_id: record.id,
      ordem: idx,
      titulo: v.titulo,
      detalhe: v.detalhe ?? null,
      status: v.status,
      observacoes: v.observacoes,
    }));
    const { error } = await supabase
      .from("checklist_verificacoes")
      .insert(verificaRows);
    if (error) throw error;
  }

  // Inserir inspeções (Etapa 3)
  if (record.inspecoes?.length) {
    const inspecaoRows = record.inspecoes.map((i, idx) => ({
      checklist_id: record.id,
      ordem: idx,
      titulo: i.titulo,
      detalhe: i.detalhe ?? null,
      status: i.status,
      observacoes: i.observacoes,
    }));
    const { data: createdInspecoes, error: inspecErr } = await supabase
      .from("checklist_inspecoes")
      .insert(inspecaoRows)
      .select("id, ordem");
    if (inspecErr) throw inspecErr;

    // Mapear id por ordem para inserir mídias
    const ordemToId = new Map<number, number>();
    (createdInspecoes as { id: number; ordem: number }[]).forEach((r) =>
      ordemToId.set(r.ordem, r.id)
    );

    const midias: Array<{
      inspecao_id: number;
      nome: string;
      tipo: string;
      tamanho: number;
      kind: "image";
      data_url: string;
    }> = [];
    record.inspecoes.forEach((i, idx) => {
      const inspecaoId = ordemToId.get(idx);
      if (!inspecaoId) return;
      i.midias.forEach((m) => {
        midias.push({
          inspecao_id: inspecaoId,
          nome: m.nome,
          tipo: m.tipo,
          tamanho: m.tamanho,
          kind: "image",
          data_url: m.dataUrl,
        });
      });
    });
    if (midias.length) {
      const { error } = await supabase
        .from("checklist_inspecoes_midias")
        .insert(midias);
      if (error) throw error;
    }
  }
}

export async function getChecklist(
  id: string
): Promise<ChecklistStored | null> {
  const supabase = getSupabaseClient();
  const { data: rows, error } = await supabase
    .from("checklists")
    .select("*")
    .eq("id", id)
    .limit(1);
  if (error) throw error;
  const row = (rows as DbChecklistRow[])[0];
  if (!row) return null;

  // Verificações
  const { data: verRows, error: verErr } = await supabase
    .from("checklist_verificacoes")
    .select("*")
    .eq("checklist_id", id)
    .order("ordem", { ascending: true });
  if (verErr) throw verErr;

  // Inspeções
  const { data: inspRows, error: inspErr } = await supabase
    .from("checklist_inspecoes")
    .select("*")
    .eq("checklist_id", id)
    .order("ordem", { ascending: true });
  if (inspErr) throw inspErr;

  const inspecaoIds = (inspRows as DbInspecaoRow[]).map((r) => r.id);
  let midiaRows: DbMidiaRow[] = [];
  if (inspecaoIds.length) {
    const { data: mRows, error: mErr } = await supabase
      .from("checklist_inspecoes_midias")
      .select("*")
      .in("inspecao_id", inspecaoIds);
    if (mErr) throw mErr;
    midiaRows = mRows as DbMidiaRow[];
  }

  const midiasByInspecao = new Map<number, DbMidiaRow[]>();
  midiaRows.forEach((m) => {
    const arr = midiasByInspecao.get(m.inspecao_id) ?? [];
    arr.push(m);
    midiasByInspecao.set(m.inspecao_id, arr);
  });

  const checklist: ChecklistStored = toChecklistSummary(row);
  checklist.verificacoes = (verRows as DbVerificacaoRow[]).map((v) => ({
    titulo: v.titulo,
    detalhe: v.detalhe ?? undefined,
    status: v.status,
    observacoes: v.observacoes,
  }));
  checklist.inspecoes = (inspRows as DbInspecaoRow[]).map((i) => ({
    titulo: i.titulo,
    detalhe: i.detalhe ?? undefined,
    status: i.status,
    observacoes: i.observacoes,
    midias: (midiasByInspecao.get(i.id) ?? []).map((m) => ({
      nome: m.nome,
      tipo: m.tipo,
      tamanho: m.tamanho,
      kind: "image",
      dataUrl: m.data_url,
    })),
  }));

  return checklist;
}

export async function deleteChecklist(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("checklists").delete().eq("id", id);
  if (error) throw error;
}
