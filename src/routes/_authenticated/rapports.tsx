import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useEtablissement } from "@/hooks/use-hotel";
import { PageHeader } from "@/components/AppLayout";
import { DocumentHeader } from "@/components/Brand";
import { formatFCFA, nbNuits, today } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/rapports")({
  head: () => ({
    meta: [
      { title: "Rapports — LE DAYA Hotel Manager" },
      {
        name: "description",
        content:
          "Rapports d'activité de LE DAYA Guest House : chiffre d'affaires, dépenses, taxe et occupation.",
      },
      { property: "og:title", content: "Rapports — LE DAYA Hotel Manager" },
      { property: "og:description", content: "Synthèse financière et taux d'occupation par période." },
    ],
  }),
  component: RapportsPage,
});

function RapportsPage() {
  const { data: etab } = useEtablissement();
  const [debut, setDebut] = useState(`${today().slice(0, 7)}-01`);
  const [fin, setFin] = useState(today());

  const { data } = useQuery({
    queryKey: ["rapports", debut, fin],
    queryFn: async () => {
      const [factures, depenses, taxes, chambres, reservations] = await Promise.all([
        supabase
          .from("factures")
          .select("*")
          .gte("date_facture", debut)
          .lte("date_facture", fin),
        supabase
          .from("depenses")
          .select("*")
          .gte("date_depense", debut)
          .lte("date_depense", fin),
        supabase
          .from("taxes_sejour")
          .select("*")
          .gte("date_nuitee", debut)
          .lte("date_nuitee", fin),
        supabase.from("chambres").select("id, nom").eq("actif", true),
        supabase
          .from("reservations")
          .select("*, chambres(nom)")
          .neq("statut", "annulee")
          .gte("date_arrivee", debut)
          .lte("date_arrivee", fin),
      ]);
      if (factures.error) throw factures.error;
      if (depenses.error) throw depenses.error;
      if (taxes.error) throw taxes.error;
      if (chambres.error) throw chambres.error;
      if (reservations.error) throw reservations.error;
      return {
        factures: factures.data,
        depenses: depenses.data,
        taxes: taxes.data,
        chambres: chambres.data,
        reservations: reservations.data,
      };
    },
  });

  const ca = (data?.factures ?? []).reduce((s, f) => s + Number(f.montant_hebergement), 0);
  const caTotal = (data?.factures ?? []).reduce((s, f) => s + Number(f.montant_total), 0);
  const impayes = (data?.factures ?? [])
    .filter((f) => f.statut !== "payee")
    .reduce((s, f) => s + Number(f.montant_total), 0);
  const totalDepenses = (data?.depenses ?? []).reduce((s, d) => s + Number(d.montant), 0);
  const totalTaxe = (data?.taxes ?? []).reduce((s, t) => s + Number(t.montant_total), 0);
  const resultat = ca - totalDepenses;

  const joursPeriode = Math.max(1, nbNuits(debut, fin) || 1);
  const nbChambres = (data?.chambres ?? []).length || 1;
  const nuitsVendues = (data?.reservations ?? []).reduce(
    (s, r) => s + nbNuits(r.date_arrivee, r.date_depart),
    0,
  );
  const occupation = Math.round((nuitsVendues / (joursPeriode * nbChambres)) * 100);

  const parChambre = (data?.chambres ?? []).map((c) => {
    const resas = (data?.reservations ?? []).filter((r) => r.chambre_id === c.id);
    const nuits = resas.reduce((s, r) => s + nbNuits(r.date_arrivee, r.date_depart), 0);
    const revenu = resas.reduce(
      (s, r) => s + nbNuits(r.date_arrivee, r.date_depart) * Number(r.prix_nuit),
      0,
    );
    return { nom: c.nom, sejours: resas.length, nuits, revenu };
  });

  const kpis = [
    { label: "CA hébergement", valeur: formatFCFA(ca) },
    { label: "Encaissements facturés", valeur: formatFCFA(caTotal) },
    { label: "Factures impayées", valeur: formatFCFA(impayes) },
    { label: "Dépenses", valeur: formatFCFA(totalDepenses) },
    { label: "Taxe de séjour collectée", valeur: formatFCFA(totalTaxe) },
    { label: "Résultat (CA - dépenses)", valeur: formatFCFA(resultat) },
    { label: "Taux d'occupation", valeur: `${isFinite(occupation) ? occupation : 0} %` },
    { label: "Nuits vendues", valeur: String(nuitsVendues) },
  ];

  return (
    <div>
      <PageHeader
        title="Rapports"
        description="Synthèse d'activité sur la période choisie"
        action={
          <Button variant="outline" className="no-print" onClick={() => window.print()}>
            <Printer className="size-4" /> Imprimer / PDF
          </Button>
        }
      />

      <div className="no-print mb-6 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Du</Label>
          <Input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Au</Label>
          <Input type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
        </div>
      </div>

      <div className="print-area">
      <DocumentHeader
        titre="Rapport d'activité"
        sousTitre={`Période du ${debut} au ${fin}`}
        etablissement={etab}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">{k.label}</CardTitle>
            </CardHeader>
            <CardContent className="font-display text-xl font-semibold">{k.valeur}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance par chambre</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chambre</TableHead>
                <TableHead>Séjours</TableHead>
                <TableHead>Nuits</TableHead>
                <TableHead className="text-right">Revenu hébergement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parChambre.map((c) => (
                <TableRow key={c.nom}>
                  <TableCell className="font-medium">{c.nom}</TableCell>
                  <TableCell>{c.sejours}</TableCell>
                  <TableCell>{c.nuits}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatFCFA(c.revenu)}
                  </TableCell>
                </TableRow>
              ))}
              {parChambre.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Aucune donnée sur la période.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
