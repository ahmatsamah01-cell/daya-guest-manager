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
import { BrandLogo } from "@/components/Brand";
import { formatFCFA, formatDate, today } from "@/lib/format";
import { useEtablissement } from "@/hooks/use-hotel";

const UNITES = [
  "", "UN", "DEUX", "TROIS", "QUATRE", "CINQ", "SIX", "SEPT", "HUIT", "NEUF",
  "DIX", "ONZE", "DOUZE", "TREIZE", "QUATORZE", "QUINZE", "SEIZE", "DIX-SEPT", "DIX-HUIT", "DIX-NEUF",
];
const DIZAINES = [
  "", "", "VINGT", "TRENTE", "QUARANTE", "CINQUANTE", "SOIXANTE", "SOIXANTE-DIX", "QUATRE-VINGT", "QUATRE-VINGT-DIX",
];

function nombreEnLettres(n: number): string {
  if (n === 0) return "ZÉRO";

  function trois(n: number): string {
    const c = Math.floor(n / 100);
    const r = n % 100;
    let s = "";
    if (c > 0) s += (c > 1 ? UNITES[c] + " " : "") + "CENT" + (c > 1 && r === 0 ? "S" : "") + " ";
    if (r > 0) {
      if (r < 20) {
        s += UNITES[r];
      } else {
        const d = Math.floor(r / 10);
        const u = r % 10;
        if (d === 7 || d === 9) {
          s += DIZAINES[d - 1] + "-" + UNITES[10 + u];
        } else {
          s += DIZAINES[d] + (u > 0 ? (u === 1 && d !== 8 ? "-ET-UN" : "-" + UNITES[u]) : d === 8 ? "S" : "");
        }
      }
    }
    return s.trim();
  }

  const tranches = [
    { valeur: 1_000_000_000, mot: "MILLIARD" },
    { valeur: 1_000_000, mot: "MILLION" },
    { valeur: 1_000, mot: "MILLE" },
  ];

  let reste = Math.round(n);
  let resultat = "";

  for (const { valeur, mot } of tranches) {
    const q = Math.floor(reste / valeur);
    if (q > 0) {
      const prefixe = valeur === 1000 && q === 1 ? "" : trois(q) + " ";
      resultat += prefixe + mot + (q > 1 && mot !== "MILLE" ? "S" : "") + " ";
      reste %= valeur;
    }
  }

  if (reste > 0) {
    resultat += trois(reste);
  }

  return resultat.trim();
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
  <Button size="sm" variant="outline" onClick={() => setDetail(f.id)}>
    Détail
  </Button>
  <Button
    size="sm"
    variant="outline"
    onClick={() => {
      setDetail(f.id);
      setTimeout(() => window.print(), 400);
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
          <div className="print-area space-y-3 text-sm">
  <div className="mb-4 text-center">
  <div className="mx-auto mb-3 max-w-[220px]">
    <BrandLogo className="mx-auto max-h-32" />
  </div>
  <p className="italic text-muted-foreground">LE DAYA Guest House</p>
</div>

  <div>
    <p>
      <span className="underline">Client</span> :{" "}
      <span className="font-semibold">
        {facture?.clients?.prenom} {facture?.clients?.nom}
      </span>
    </p>
    <p className="font-semibold">Facture hébergements N°{facture?.numero}</p>
  </div>

  <p className="text-xs text-muted-foreground">
    Les arrivées se font tous les jours entre 13h30 et 20h00
    <br />
    Les départs se font tous les jours au plus tard à 12h00
  </p>

  <div className="divide-y rounded-lg border">
    {(lignes ?? [])
      .filter((l) => !l.libelle.startsWith("Taxe de séjour"))
      .map((l) => (
        <div key={l.id} className="flex justify-between gap-4 p-3">
          <span>{l.libelle}</span>
          <span className="whitespace-nowrap">{formatFCFA(l.montant)}</span>
        </div>
      ))}
  </div>

  <div className="flex justify-between font-medium">
    <span>Total HT</span>
    <span>
      {formatFCFA(Number(facture?.montant_hebergement ?? 0) + Number(facture?.montant_autres ?? 0))}
    </span>
  </div>

  {facture && Number(facture.montant_remise) > 0 ? (
    <>
      <div className="flex justify-between text-destructive">
        <span>{facture.motif_remise ?? "Remise"}</span>
        <span className="whitespace-nowrap">- {formatFCFA(facture.montant_remise)}</span>
      </div>
      <div className="flex justify-between font-medium">
        <span>Total net HT</span>
        <span>
          {formatFCFA(
            Number(facture.montant_hebergement) +
              Number(facture.montant_autres) -
              Number(facture.montant_remise),
          )}
        </span>
      </div>
    </>
  ) : null}

  {facture && Number(facture.montant_taxe) > 0 ? (
    <div className="flex justify-between">
      <span>Taxe de séjour</span>
      <span className="whitespace-nowrap">{formatFCFA(facture.montant_taxe)}</span>
    </div>
  ) : null}

  <div className="flex justify-between font-display text-lg font-semibold">
    <span>Total TTC</span>
    <span>{formatFCFA(facture?.montant_total ?? 0)}</span>
  </div>

  {facture && Number(facture.montant_paye) > 0 ? (
    <>
      <div className="flex justify-between">
        <span>Avance</span>
        <span className="whitespace-nowrap">{formatFCFA(facture.montant_paye)}</span>
      </div>
      <div className="flex justify-between font-semibold text-destructive">
        <span>Reste à payer</span>
        <span className="whitespace-nowrap">
          {formatFCFA(Number(facture.montant_total) - Number(facture.montant_paye))}
        </span>
      </div>
    </>
  ) : null}

  <p className="pt-2">
    Arrêter la présente facture à la somme de{" "}
    <span className="font-semibold">
      {nombreEnLettres(Number(facture?.montant_total ?? 0))} FRANCS CFA.
    </span>
  </p>

  <p className="pt-4 text-right">
  Fait à Port-Gentil, le {formatDate(today())}
</p>

<div className="mt-8 border-t pt-3 text-center text-[10px] text-muted-foreground">
  <p className="font-semibold">LE DAYA Guest House by LDJ</p>
  <p>Hébergements – Appartements hôtel – Restaurant - bar</p>
  <p>BP 780 Port-Gentil / GABON - Tel : 074.87.42.33 Email : ledayaguestpog@gmail.com</p>
  <p>RCCM : RG/POG 2021 A 15358 – N.I.F : 319220 T</p>
  <p>
    Identité Bancaire ORABANK : Le DAYA Guest House - compte N° 40021 02001 22873000201 Clé 63
  </p>
</div>

</div>
          <div className="no-print flex justify-end">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
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
