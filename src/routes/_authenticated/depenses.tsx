import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatFCFA, formatDate, today } from "@/lib/format";
import { useEtablissement } from "@/hooks/use-hotel";

export const Route = createFileRoute("/_authenticated/depenses")({
  head: () => ({
    meta: [
      { title: "Dépenses — LE DAYA Hotel Manager" },
      {
        name: "description",
        content:
          "Suivi des dépenses de LE DAYA Guest House par catégorie : achats, énergie, salaires, entretien.",
      },
      { property: "og:title", content: "Dépenses — LE DAYA Hotel Manager" },
      { property: "og:description", content: "Charges d'exploitation détaillées en FCFA." },
    ],
  }),
  component: DepensesPage,
});

const CATEGORIES = [
  "Achats",
  "Énergie & eau",
  "Salaires",
  "Entretien",
  "Transport",
  "Taxes & impôts",
  "Divers",
];

function DepensesPage() {
  const qc = useQueryClient();
  const { data: etab } = useEtablissement();
  const [open, setOpen] = useState(false);
  const [mois, setMois] = useState(today().slice(0, 7));
  const [form, setForm] = useState({
    date_depense: today(),
    categorie: CATEGORIES[0],
    libelle: "",
    montant: "",
    mode_paiement: "especes",
    fournisseur: "",
    reporter_caisse: true,
  });

  const { data: depenses } = useQuery({
    queryKey: ["depenses", mois],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("depenses")
        .select("*")
        .gte("date_depense", `${mois}-01`)
        .lte("date_depense", `${mois}-31`)
        .order("date_depense", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const creer = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("depenses").insert({
        etablissement_id: etab!.id,
        date_depense: form.date_depense,
        categorie: form.categorie,
        libelle: form.libelle,
        montant: Number(form.montant),
        mode_paiement: form.mode_paiement,
        fournisseur: form.fournisseur || null,
        created_by: u.user?.id ?? null,
      });
      if (error) throw error;

      if (form.reporter_caisse) {
        const { error: eOp } = await supabase.from("caisse_operations").insert({
          etablissement_id: etab!.id,
          sens: "sortie",
          motif: `Dépense — ${form.libelle}`,
          montant: Number(form.montant),
          mode_paiement: form.mode_paiement,
          created_by: u.user?.id ?? null,
        });
        if (eOp) throw eOp;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setOpen(false);
      setForm({ ...form, libelle: "", montant: "", fournisseur: "" });
      toast.success("Dépense enregistrée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = (depenses ?? []).reduce((s, d) => s + Number(d.montant), 0);
  const parCategorie = CATEGORIES.map((c) => ({
    categorie: c,
    total: (depenses ?? [])
      .filter((d) => d.categorie === c)
      .reduce((s, d) => s + Number(d.montant), 0),
  })).filter((c) => c.total > 0);

  return (
    <div>
      <PageHeader
        title="Dépenses"
        description="Charges d'exploitation de l'établissement"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> Nouvelle dépense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle dépense</DialogTitle>
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
                    <Label>Date</Label>
                    <Input
                      type="date"
                      required
                      value={form.date_depense}
                      onChange={(e) => setForm({ ...form, date_depense: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Select
                      value={form.categorie}
                      onValueChange={(v) => setForm({ ...form, categorie: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Libellé</Label>
                  <Input
                    required
                    value={form.libelle}
                    onChange={(e) => setForm({ ...form, libelle: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
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
                  <div className="space-y-2">
                    <Label>Mode de paiement</Label>
                    <Select
                      value={form.mode_paiement}
                      onValueChange={(v) => setForm({ ...form, mode_paiement: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="especes">Espèces</SelectItem>
                        <SelectItem value="mobile_money">Mobile money</SelectItem>
                        <SelectItem value="virement">Virement</SelectItem>
                        <SelectItem value="carte">Carte bancaire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Fournisseur</Label>
                  <Input
                    value={form.fournisseur}
                    onChange={(e) => setForm({ ...form, fournisseur: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.reporter_caisse}
                    onChange={(e) => setForm({ ...form, reporter_caisse: e.target.checked })}
                  />
                  Reporter automatiquement en sortie de caisse
                </label>
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

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total du mois</CardTitle>
          </CardHeader>
          <CardContent className="font-display text-2xl font-semibold">
            {formatFCFA(total)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Répartition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {parCategorie.length === 0 ? (
              <p className="text-muted-foreground">Aucune dépense ce mois-ci.</p>
            ) : (
              parCategorie.map((c) => (
                <div key={c.categorie} className="flex justify-between">
                  <span>{c.categorie}</span>
                  <span>{formatFCFA(c.total)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 max-w-48 space-y-1">
        <Label className="text-xs">Mois</Label>
        <Input type="month" value={mois} onChange={(e) => setMois(e.target.value)} />
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(depenses ?? []).map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(d.date_depense)}</TableCell>
                  <TableCell>{d.categorie}</TableCell>
                  <TableCell>{d.libelle}</TableCell>
                  <TableCell>{d.fournisseur ?? "—"}</TableCell>
                  <TableCell>{d.mode_paiement}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatFCFA(d.montant)}
                  </TableCell>
                </TableRow>
              ))}
              {(depenses ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Aucune dépense sur ce mois.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
