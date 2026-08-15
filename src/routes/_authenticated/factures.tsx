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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/AppLayout";
import { LOGO_URL } from "@/components/Brand";
import { FactureDocument, type FactureDocumentData } from "@/components/FactureDocument";
import { formatFCFA, formatDate } from "@/lib/format";
import { useEtablissement } from "@/hooks/use-hotel";

function imprimerFacture() {
  const contenu = document.querySelector(".facture-a4");
  if (!contenu) return;
  const fenetre = window.open("", "_blank", "width=900,height=1000");
  if (!fenetre) return;

  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((el) => el.outerHTML)
    .join("\n");

  fenetre.document.write(`
    <html>
      <head>
        <title>Facture</title>
        ${styles}
      </head>
      <body style="margin:0;">
        ${contenu.outerHTML}
      </body>
    </html>
  `);
  fenetre.document.close();

  fenetre.onload = () => {
    fenetre.focus();
    fenetre.print();
  };
}

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

const factureData: FactureDocumentData | null = facture
    ? {
        numero: facture.numero,
        clientNom: `${facture.clients?.prenom ?? ""} ${facture.clients?.nom ?? ""}`.trim(),
        periodeLabel: formatDate(facture.date_facture),
        lignesHebergement: (lignes ?? [])
          .filter((l) => l.libelle.startsWith("Hébergement"))
          .map((l) => ({
            periode: l.libelle,
            nuitees: Number(l.quantite),
            chambre: "",
            prixUnitaire: Number(l.prix_unitaire),
            prixTotal: Number(l.montant),
          })),
        totalHebergement: Number(facture.montant_hebergement),
        buanderie:
          Number(facture.montant_autres) > 0
            ? {
                detail: formatFCFA(facture.montant_autres),
                total: Number(facture.montant_autres),
              }
            : undefined,
        remise:
          Number(facture.montant_remise) > 0
            ? {
                label: facture.motif_remise || "Remise",
                montant: Number(facture.montant_remise),
              }
            : undefined,
        avance: Number(facture.montant_paye) > 0 ? Number(facture.montant_paye) : undefined,
        totalGeneral: Number(facture.montant_total),
        ville: etab?.ville ?? "Port-Gentil",
        dateEmission: formatDate(facture.date_facture),
        etablissement: {
          nom: etab?.nom ?? "LE DAYA Guest House",
          adresse: "BP 780",
          telephone: "074.87.42.33",
          email: "ledayaguestpog@gmail.com",
          rccm: "RG/POG 2021 A 15358",
          nif: "319220 T",
          banque: "ORABANK : Le DAYA Guest House",
          compte: "40021 02001 22873000201",
          cle: "63",
        },
        logoUrl: LOGO_URL,
      }
    : null;

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
                <TableHead>Remise</TableHead>
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
                  <TableCell className="whitespace-nowrap text-destructive">
                    {Number(f.montant_remise) > 0 ? `- ${formatFCFA(f.montant_remise)}` : "—"}
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {formatFCFA(f.montant_total)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={f.statut === "payee" ? "secondary" : "destructive"}>
                      {f.statut === "payee" ? "Payée" : "Impayée"}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2 text-right whitespace-nowrap">
  <Button
  size="sm"
  variant="outline"
  onClick={() => {
    setDetail(f.id);
    setTimeout(() => imprimerFacture(), 600);
  }}
>
  Imprimer
</Button>
  {f.statut !== "payee" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRemiseFacture(f.id);
                            setRemiseForm({
                              type: "montant",
                              valeur: String(Number(f.montant_remise) || ""),
                              motif: f.motif_remise ?? "",
                            });
                          }}
                        >
                          Remise
                        </Button>
                        <Button size="sm" onClick={() => payer.mutate(f)}>
                          Encaisser
                        </Button>
                      </>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {(factures ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
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
          {factureData ? <FactureDocument data={factureData} /> : null}
          <div className="no-print flex justify-end">
           <Button variant="outline" size="sm" onClick={imprimerFacture}>
  Imprimer / PDF
</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!remiseFacture} onOpenChange={(o) => !o && setRemiseFacture(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appliquer une réduction</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              appliquerRemise.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Type de réduction</Label>
              <Select
                value={remiseForm.type}
                onValueChange={(v) => setRemiseForm({ ...remiseForm, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="montant">Montant fixe (FCFA)</SelectItem>
                  <SelectItem value="pourcentage">Pourcentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valeur</Label>
              <Input
                type="number"
                min="0"
                required
                value={remiseForm.valeur}
                onChange={(e) => setRemiseForm({ ...remiseForm, valeur: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Motif (facultatif)</Label>
              <Input
                value={remiseForm.motif}
                onChange={(e) => setRemiseForm({ ...remiseForm, motif: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={appliquerRemise.isPending}>
                Appliquer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
