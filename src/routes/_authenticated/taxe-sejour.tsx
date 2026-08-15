import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/AppLayout";
import { formatFCFA, formatDate, today } from "@/lib/format";
import { useEtablissement, useParametres } from "@/hooks/use-hotel";

export const Route = createFileRoute("/_authenticated/taxe-sejour")({
  head: () => ({
    meta: [
      { title: "Taxe de séjour — LE DAYA Hotel Manager" },
      {
        name: "description",
        content:
          "Collecte et reversement de la taxe de séjour par nuitée pour LE DAYA Guest House, Port-Gentil.",
      },
      { property: "og:title", content: "Taxe de séjour — LE DAYA Hotel Manager" },
      { property: "og:description", content: "Taxe collectée par nuitée et suivi des reversements." },
    ],
  }),
  component: TaxePage,
});

function TaxePage() {
  const qc = useQueryClient();
  const { data: etab } = useEtablissement();
  const { data: params } = useParametres(etab?.id);
  const montantUnitaire = Number(params?.["taxe_sejour_montant"] ?? 1000);
  const [mois, setMois] = useState(today().slice(0, 7));

  const { data: taxes } = useQuery({
    queryKey: ["taxes_sejour", mois],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("taxes_sejour")
        .select("*, reservations(date_arrivee, date_depart, clients(nom, prenom), chambres(nom))")
        .gte("date_nuitee", `${mois}-01`)
        .lte("date_nuitee", `${mois}-31`)
        .order("date_nuitee", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    date_nuitee: today(),
    nb_nuits: "1",
    montant_unitaire: String(montantUnitaire),
    reverse: false,
  });

  const modifier = useMutation({
    mutationFn: async () => {
      const nuits = Math.max(1, Number(editForm.nb_nuits) || 1);
      const unitaire = Number(editForm.montant_unitaire) || 0;
      const { error } = await supabase
        .from("taxes_sejour")
        .update({
          date_nuitee: editForm.date_nuitee,
          nb_nuits: nuits,
          montant_unitaire: unitaire,
          montant_total: nuits * unitaire,
          reverse: editForm.reverse,
          date_reversement: editForm.reverse ? today() : null,
        })
        .eq("id", editId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setEditId(null);
      toast.success("Taxe modifiée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reverser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("taxes_sejour")
        .update({ reverse: true, date_reversement: today() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["taxes_sejour"] });
      toast.success("Taxe marquée comme reversée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const collecte = (taxes ?? []).reduce((s, t) => s + Number(t.montant_total), 0);
  const aReverser = (taxes ?? [])
    .filter((t) => !t.reverse)
    .reduce((s, t) => s + Number(t.montant_total), 0);
  const nuitees = (taxes ?? []).reduce((s, t) => s + t.nb_nuits, 0);

  return (
    <div>
      <PageHeader
        title="Taxe de séjour"
        description={`Taux en vigueur : ${formatFCFA(montantUnitaire)} par nuitée et par chambre`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Collectée (mois)</CardTitle>
          </CardHeader>
          <CardContent className="font-display text-2xl font-semibold">
            {formatFCFA(collecte)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Reste à reverser</CardTitle>
          </CardHeader>
          <CardContent className="font-display text-2xl font-semibold text-destructive">
            {formatFCFA(aReverser)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Nuitées taxées</CardTitle>
          </CardHeader>
          <CardContent className="font-display text-2xl font-semibold">{nuitees}</CardContent>
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
                <TableHead>Client</TableHead>
                <TableHead>Chambre</TableHead>
                <TableHead>Nuitées</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(taxes ?? []).map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(t.date_nuitee)}</TableCell>
                  <TableCell>
                    {t.reservations?.clients?.prenom} {t.reservations?.clients?.nom}
                  </TableCell>
                  <TableCell>{t.reservations?.chambres?.nom ?? "—"}</TableCell>
                  <TableCell>{t.nb_nuits}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatFCFA(t.montant_total)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.reverse ? "secondary" : "destructive"}>
                      {t.reverse ? "Reversée" : "À reverser"}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2 text-right whitespace-nowrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditId(t.id);
                        setEditForm({
                          date_nuitee: t.date_nuitee,
                          nb_nuits: String(t.nb_nuits),
                          montant_unitaire: String(t.montant_unitaire),
                          reverse: t.reverse,
                        });
                      }}
                    >
                      Modifier
                    </Button>
                    {!t.reverse ? (
                      <Button size="sm" onClick={() => reverser.mutate(t.id)}>
                        Marquer reversée
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {t.date_reversement ? formatDate(t.date_reversement) : ""}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(taxes ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Aucune taxe collectée sur ce mois. Les taxes sont générées au check-out.
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
