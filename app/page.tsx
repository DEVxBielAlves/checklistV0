"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  deleteChecklist,
  listChecklists,
  getChecklist,
  type ChecklistStored,
} from "@/lib/storage";
import { downloadChecklistPdf } from "@/lib/pdf";
import { Eye, FileDown, Plus, Trash2 } from "lucide-react";

export default function HomePage() {
  const { toast } = useToast();
  const [items, setItems] = useState<ChecklistStored[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await listChecklists();
        if (mounted) setItems(data);
      } catch (e) {
        // noop (toast opcional)
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const data = await listChecklists();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteChecklist(id);
    toast({ title: "Checklist excluído" });
    setConfirmId(null);
    setConfirmText("");
    await refresh();
  }

  const filtered = items.filter(
    (c) =>
      c.dadosIniciais.motorista.toLowerCase().includes(query.toLowerCase()) ||
      c.dadosIniciais.inspetor.toLowerCase().includes(query.toLowerCase()) ||
      c.dadosIniciais.placa.toLowerCase().includes(query.toLowerCase()) ||
      c.titulo.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="mx-auto w-full max-w-[680px] p-3 sm:p-4 overflow-x-hidden">
      <header className="mb-4">
        <h1 className="text-lg sm:text-xl font-semibold">Checklist Basel</h1>
        <p className="text-xs text-zinc-500">Histórico de checklists</p>
        <div className="mt-2">
          <Input
            placeholder="Buscar por placa, motorista, inspetor ou título"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </header>

      <div className="grid gap-3">
        {filtered.length === 0 && (
          <Card>
            <CardContent className="p-4 text-sm text-zinc-600">
              Nenhum checklist encontrado.
            </CardContent>
          </Card>
        )}

        {filtered.map((c) => (
          <Card
            key={c.id}
            className="border-zinc-200 rounded-lg overflow-x-hidden"
          >
            <CardHeader className="pb-1 px-4 sm:px-6">
              <CardTitle className="text-sm sm:text-base flex items-center justify-between gap-2 min-w-0">
                <span className="truncate">{c.titulo}</span>
                <Badge variant={c.completo ? "default" : "secondary"}>
                  {c.completo ? "Completo" : "Incompleto"}
                </Badge>
              </CardTitle>
              <div className="text-[10px] sm:text-[11px] text-zinc-500">
                Criado em: {c.criadoEm}
              </div>
            </CardHeader>
            <CardContent className="grid gap-1 text-[11px] sm:text-xs text-zinc-700 px-4 sm:px-6">
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
            <CardFooter className="flex items-center justify-between gap-2 px-3 sm:px-4">
              <div className="flex gap-2">
                <Link href={`/checklist/${c.id}`} className="inline-flex">
                  <Button variant="outline" size="sm">
                    <Eye className="mr-1 h-4 w-4" />
                    Ver mais
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const full = await getChecklist(c.id);
                    if (full) downloadChecklistPdf(full);
                  }}
                >
                  <FileDown className="mr-1 h-4 w-4" />
                  Download PDF
                </Button>
              </div>

              <Dialog
                open={confirmId === c.id}
                onOpenChange={(open) => {
                  if (!open) {
                    setConfirmId(null);
                    setConfirmText("");
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmId(c.id)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Excluir
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmar exclusão</DialogTitle>
                    <DialogDescription>
                      Digite <span className="font-semibold">delete</span> para
                      confirmar a exclusão do checklist.
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

      {/* Ação principal em barra */}
      <div className="fixed inset-x-3 bottom-3">
        <Link href="/checklist" className="block">
          <Button className="w-full h-12 rounded-lg shadow-lg">
            <Plus className="mr-2 h-5 w-5" />
            Novo checklist
          </Button>
        </Link>
      </div>
    </main>
  );
}
