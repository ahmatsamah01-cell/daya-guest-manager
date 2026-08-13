import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/AppLayout";
import { DocumentHeader } from "@/components/Brand";
import { formatFCFA, formatDate, today } from "@/lib/format";
import { useEtablissement } from "@/hooks/use-hotel";

export const Route = createFileRoute("/_authenticated/pcs")({
  head: () => ({
    meta: [
      { title: "PCS — Pièces de caisse — LE DAYA Hotel Manager" },
      {
        name: "description",
        content:
          "Émission des pièces de caisse (entrée / sortie) justifiant chaque mouvement d'espèces.",
      },
      { property: "og:title", content: "Pièces de caisse — LE DAYA Hotel Manager" },
      { property: "og:description", content: "Justificatifs numérotés des mouvements de caisse." },
    ],
  }),
  component: PcsPage,
});

function PcsPage() {
  const qc = useQueryClient();
  const { data: etab } = useEtablissement();
  const [open, setOpen] = useState(false);
  const [recu, setRecu] = useState<string | null>(null);
  const [form, setForm] = useState({
    type_piece: "sortie",
    date_piece: today(),
    beneficiaire: "",
    motif: "",
    montant: "",
  });

  const { data: pieces } = useQuery({
    queryKey: ["pieces_caisse"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pieces_caisse")
        .select("*")
        .order("date_piece", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const creer = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { count } = await supabase
        .from("pieces_caisse")
        .select("id", { count: "exact", head: true });
      const prefixe = form.type_piece === "entree" ? "PCE" : "PCS";
      const numero = `${prefixe}-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(4, "0")}`;

      const { data: op, error: eOp } = await supabase
        .from("caisse_operations")
        .insert({
          etablissement_id: etab!.id,
          sens: form.type_piece === "entree" ? "entree" : "sortie",
          motif: `${numero} — ${form.motif}`,
          montant: Number(form.montant),
          mode_paiement: "especes",
          created_by: u.user?.id ?? null,
        })
        .select()
        .single();
      if (eOp) throw eOp;

      const { error } = await supabase.from("pieces_caisse").insert({
        etablissement_id: etab!.id,
        numero,
        type_piece: form.type_piece,
        date_piece: form.date_piece,
        beneficiaire: form.beneficiaire,
        motif: form.motif,
        montant: Number(form.montant),
        operation_id: op.id,
        created_by: u.user?.id ?? null,
      });
      if (error) throw error;
      return numero;
    },
    onSuccess: (numero) => {
      qc.invalidateQueries();
      setOpen(false);
      setForm({
        type_piece: "sortie",
        date_piece: today(),
        beneficiaire: "",
        motif: "",
        montant: "",
      });
      toast.success(`Pièce ${numero} créée et reportée en caisse.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pieceRecu = (pieces ?? []).find((p) => p.id === recu);

  return (
    <div>
      <PageHeader
        title="Pièces de caisse (PCS)"
        description="Justificatifs numérotés des mouvements d'espèces"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> Nouvelle pièce
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle pièce de caisse</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  creer.mutate();
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={form.type_piece}
                      onValueChange={(v) => setForm({ ...form, type_piece: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sortie">Sortie (décaissement)</SelectItem>
                        <SelectItem value="entree">Entrée (encaissement)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      required
                      value={form.date_piece}
                      onChange={(e) => setForm({ ...form, date_piece: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Bénéficiaire</Label>
                  <Input
                    required
                    value={form.beneficiaire}
                    onChange={(e) => setForm({ ...form, beneficiaire: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Motif</Label>
                  <Input
                    required
                    value={form.motif}
                    onChange={(e) => setForm({ ...form, motif: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Montant (FCFA)</Label>
                  <Input
                    type="number"
                    min="0"
                    required
                    value={form.montant}
                    onChange={(e) => setForm({ ...form, montant: e.target.value })}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={creer.isPending || !etab}>
                    Enregistrer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Bénéficiaire</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Reçu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(pieces ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.numero}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(p.date_piece)}</TableCell>
                  <TableCell>{p.beneficiaire}</TableCell>
                  <TableCell>{p.motif}</TableCell>
                  <TableCell>
                    <Badge variant={p.type_piece === "entree" ? "secondary" : "destructive"}>
                      {p.type_piece === "entree" ? "Entrée" : "Sortie"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatFCFA(p.montant)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setRecu(p.id)}>
                      Reçu
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(pieces ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Aucune pièce de caisse enregistrée.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!recu} onOpenChange={(o) => !o && setRecu(null)}>
        <DialogContent>
          <DialogHeader className="no-print">
            <DialogTitle>Reçu — pièce de caisse</DialogTitle>
          </DialogHeader>
          {pieceRecu ? (
            <div className="print-area space-y-3 text-sm">
              <DocumentHeader
                titre={`Pièce de caisse ${pieceRecu.numero}`}
                sousTitre={formatDate(pieceRecu.date_piece)}
                etablissement={etab}
              />
              <div className="divide-y rounded-lg border">
                <div className="flex justify-between gap-4 p-3">
                  <span className="text-muted-foreground">Type</span>
                  <span>{pieceRecu.type_piece === "entree" ? "Entrée" : "Sortie"}</span>
                </div>
                <div className="flex justify-between gap-4 p-3">
                  <span className="text-muted-foreground">Bénéficiaire</span>
                  <span>{pieceRecu.beneficiaire}</span>
                </div>
                <div className="flex justify-between gap-4 p-3">
                  <span className="text-muted-foreground">Motif</span>
                  <span>{pieceRecu.motif}</span>
                </div>
              </div>
              <div className="font-display flex justify-between text-lg font-semibold">
                <span>Montant</span>
                <span>{formatFCFA(pieceRecu.montant)}</span>
              </div>
              <div className="grid grid-cols-2 gap-6 pt-6 text-[11px] text-muted-foreground">
                <p>Signature bénéficiaire</p>
                <p className="text-right">Signature caissier</p>
              </div>
            </div>
          ) : null}
          <div className="no-print flex justify-end">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              Imprimer / PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
