import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/AppLayout";
import { DocumentHeader } from "@/components/Brand";
import { formatFCFA, formatDate } from "@/lib/format";
import { useEtablissement } from "@/hooks/use-hotel";

export const Route = createFileRoute("/_authenticated/factures")({
  head: () => ({
    meta: [
      { title: "Facturation — LE DAYA Hotel Manager" },
      {
        name: "description",
        content: "Factures clients de LE DAYA Guest House : détail des lignes, taxe et règlements.",
      },
      { property: "og:title", content: "Facturation — LE DAYA Hotel Manager" },
      { property: "og:description", content: "Émission et suivi des factures en FCFA." },
    ],
  }),
  component: FacturesPage,
});

function FacturesPage() {
  const qc = useQueryClient();
  const { data: etab } = useEtablissement();
  const [detail, setDetail] = useState<string | null>(null);

  const { data: factures } = useQuery({
    queryKey: ["factures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("factures")
        .select("*, clients(nom, prenom)")
        .order("date_facture", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: lignes } = useQuery({
    queryKey: ["facture-lignes", detail],
    enabled: !!detail,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facture_lignes")
        .select("*")
        .eq("facture_id", detail!);
      if (error) throw error;
      return data;
    },
  });

  const [remiseFacture, setRemiseFacture] = useState<string | null>(null);
  const [remiseForm, setRemiseForm] = useState({ type: "montant", valeur: "", motif: "" });

  const appliquerRemise = useMutation({
    mutationFn: async () => {
      const f = (factures ?? []).find((x) => x.id === remiseFacture);
      if (!f) throw new Error("Facture introuvable");
      const base =
        Number(f.montant_hebergement) + Number(f.montant_taxe) + Number(f.montant_autres);
      const valeur = Number(remiseForm.valeur) || 0;
      const remise =
        remiseForm.type === "pourcentage" ? Math.round((base * valeur) / 100) : valeur;
      if (remise < 0 || remise > base) throw new Error("Remise invalide");
      const { error } = await supabase
        .from("factures")
        .update({
          montant_remise: remise,
          motif_remise: remiseForm.motif || null,
          montant_total: base - remise,
        })
        .eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setRemiseFacture(null);
      setRemiseForm({ type: "montant", valeur: "", motif: "" });
      toast.success("Remise appliquée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const payer = useMutation({
    mutationFn: async (f: NonNullable<typeof factures>[number]) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("factures")
        .update({ statut: "payee" })
        .eq("id", f.id);
      if (error) throw error;
      const { error: eCaisse } = await supabase.from("caisse_operations").insert({
        etablissement_id: f.etablissement_id,
        sens: "entree",
        motif: `Règlement facture ${f.numero}`,
        montant: Number(f.montant_total),
        mode_paiement: "especes",
        facture_id: f.id,
        created_by: u.user?.id ?? null,
      });
      if (eCaisse) throw eCaisse;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Facture réglée et encaissée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const facture = (factures ?? []).find((f) => f.id === detail);

  return (
    <div>
      <PageHeader
        title="Facturation"
        description={`Factures émises${etab ? ` — ${etab.nom}` : ""}`}
      />

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Hébergement</TableHead>
                <TableHead>Taxe</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(factures ?? []).map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.numero}</TableCell>
                  <TableCell>
                    {f.clients?.prenom} {f.clients?.nom}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(f.date_facture)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatFCFA(f.montant_hebergement)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatFCFA(f.montant_taxe)}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {formatFCFA(f.montant_total)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={f.statut === "payee" ? "secondary" : "destructive"}>
                      {f.statut === "payee" ? "Payée" : "Impayée"}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2 text-right whitespace-nowrap">
                    <Button size="sm" variant="outline" onClick={() => setDetail(f.id)}>
                      Détail
                    </Button>
                    {f.statut !== "payee" ? (
                      <Button size="sm" onClick={() => payer.mutate(f)}>
                        Encaisser
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {(factures ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Aucune facture. Les factures sont générées au check-out d'une réservation.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader className="no-print">
            <DialogTitle>Facture {facture?.numero}</DialogTitle>
          </DialogHeader>
          <div className="print-area space-y-3 text-sm">
            <DocumentHeader
              titre={`Facture ${facture?.numero ?? ""}`}
              sousTitre={facture ? formatDate(facture.date_facture) : undefined}
              etablissement={etab}
            />
            <p className="text-muted-foreground">
              {facture?.clients?.prenom} {facture?.clients?.nom} —{" "}
              {facture ? formatDate(facture.date_facture) : ""}
            </p>
            <div className="divide-y rounded-lg border">
              {(lignes ?? []).map((l) => (
                <div key={l.id} className="flex justify-between gap-4 p-3">
                  <span>{l.libelle}</span>
                  <span className="whitespace-nowrap">{formatFCFA(l.montant)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-display text-lg font-semibold">
              <span>Total</span>
              <span>{formatFCFA(facture?.montant_total ?? 0)}</span>
            </div>
            <p className="pt-2 text-[10px] text-muted-foreground">
              Document généré par LE DAYA Hotel Manager.
            </p>
          </div>
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
