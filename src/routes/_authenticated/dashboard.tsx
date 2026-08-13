import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuefrom@tanstack/react-query";Route
import { BedDouble, CalendarCheck, Wallet, TrendingDown, Landmark, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/AppLayout";
import { BrandLogo, SLOGAN } from "@/components/Brand";
import { formatFCFA, formatDate, today } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — LE DAYA Hotel Manager" },
      {
        name: "description",
        content:
          "Vue d'ensemble quotidienne de LE DAYA Guest House : occupation, arrivées, recettes, dépenses et taxe de séjour.",
      },
      { property: "og:title", content: "Tableau de bord — LE DAYA Hotel Manager" },
      {
       property: "og:description",
        content: "Occupation, recettes et activité du jour de LE DAYA Guest House.",
      },
    ],
  }),
  component: Dashboard,
});

function Stat({
  titre,
  valeur,
  detail,
  icon: Icon,
  to,
}: {
  titre: string;
  valeur: string;
  detail?: string;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
}) {
  const contenu = (
    <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {titre}
        </CardTitle>
        <Icon className="size-4 text-primary" />
      </CardHeader>

      <CardContent>
        <p className="font-display text-2xl font-semibold">{valeur}</p>

        {detail ? (
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        ) : null}
      </CardContent>
    </Card>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {contenu}
      </Link>
    );
  }

  return contenu;

function Dashboard() {
  const jour = today();
  const [periode, setPeriode] = useState("jour");
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", jour],
    queryFn: async () => {
      const [chambres, resas, ops, deps, taxes, clients] = await Promise.all([
        supabase.from("chambres").select("*").eq("actif", true).order("nom"),
        supabase
          .from("reservations")
          .select("*, clients(nom, prenom), chambres(nom)")
          .neq("statut", "annulee")
          .order("date_arrivee"),
        supabase.from("caisse_operations").select("*").gte("date_operation", `${jour}T00:00:00`),
        supabase.from("depenses").select("*").eq("date_depense", jour),
        supabase.from("taxes_sejour").select("*").gte("date_nuitee", jour.slice(0, 8) + "01"),
        supabase.from("clients").select("id"),
      ]);
      for (const r of [chambres, resas, ops, deps, taxes, clients]) if (r.error) throw r.error;
      return {
        chambres: chambres.data ?? [],
        reservations: resas.data ?? [],
        operations: ops.data ?? [],
        depenses: deps.data ?? [],
        taxes: taxes.data ?? [],
        clients: clients.data ?? [],
      };
    },
  });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  const enCours = data.reservations.filter(
    (r) => r.statut === "en_cours" || (r.date_arrivee <= jour && r.date_depart > jour),
  );
  const occupees = new Set(enCours.map((r) => r.chambre_id));
  const arrivees = data.reservations.filter((r) => r.date_arrivee === jour);
  const departs = data.reservations.filter((r) => r.date_depart === jour);
  const entrees = data.operations
    .filter((o) => o.sens === "entree")
    .reduce((s, o) => s + Number(o.montant), 0);
  const sorties = data.operations
    .filter((o) => o.sens === "sortie")
    .reduce((s, o) => s + Number(o.montant), 0);
  const depensesJour = data.depenses.reduce((s, d) => s + Number(d.montant), 0);
  const taxeMois = data.taxes.reduce((s, t) => s + Number(t.montant_total), 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
        <div className="rounded-lg bg-white p-2">
          <BrandLogo className="max-h-16 sm:max-h-20" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold">LE DAYA Guest House</p>
          <p className="text-sm text-muted-foreground italic">{SLOGAN}</p>
        </div>
      </div>

      <div className="mb-4 flex justify-end">
  <Select value={periode} onValueChange={setPeriode}>
    <SelectTrigger className="w-[180px]">
      <SelectValue placeholder="Période" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="jour">Aujourd'hui</SelectItem>
      <SelectItem value="semaine">Cette semaine</SelectItem>
      <SelectItem value="mois">Ce mois</SelectItem>
      <SelectItem value="annee">Cette année</SelectItem>
    </SelectContent>
  </Select>
</div>
<PageHeader
        title="Tableau de bord"
        description={`LE DAYA Guest House — situation du ${formatDate(jour)}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat
          titre="Occupation"
          valeur={`${occupees.size}/${data.chambres.length}`}
          detail={`${data.chambres.length - occupees.size} chambre(s) disponible(s)`}
          icon={BedDouble}
          to="/_authenticated/chambres"     
         />
        <Stat
          titre="Arrivées / départs du jour"
          valeur={`${arrivees.length} / ${departs.length}`}
          detail="Mouvements prévus aujourd'hui"
          icon={CalendarCheck}
          to="/_authenticated/réservations"
        />
        <Stat
          titre="Recettes encaissées (jour)"
          valeur={formatFCFA(entrees)}
          detail={`Sorties de caisse : ${formatFCFA(sorties)}`}
          icon={Wallet}
            to="/_authenticated/caisses"
        />
        <Stat
          titre="Dépenses du jour"
          valeur={formatFCFA(depensesJour)}
          detail={`${data.depenses.length} dépense(s) enregistrée(s)`}
          icon={TrendingDown}
        />
        <Stat
          titre="Taxe de séjour (mois)"
          valeur={formatFCFA(taxeMois)}
          detail="Collectée depuis le 1er du mois"
          icon={Landmark}
            to="/_authenticated/taxe-séjour"
        />
        <Stat
          titre="Clients enregistrés"
          valeur={String(data.clients.length)}
          detail="Fichier clients de l'établissement"
          icon={Users}
            to="/_authenticated/clients"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">État des chambres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.chambres.map((c) => {
              const occupee = occupees.has(c.id);
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{c.nom}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.type} — {formatFCFA(c.prix_nuit)} / nuit
                    </p>
                  </div>
                  <Badge variant={occupee ? "destructive" : "secondary"}>
                    {occupee ? "Occupée" : "Libre"}
                  </Badge>
                </div>
              );
            })}
            {data.chambres.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune chambre enregistrée.</p>
            ) : null}
          </CardContent>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prochaines arrivées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.reservations
              .filter((r) => r.date_arrivee >= jour && r.statut === "reservee")
              .slice(0, 8)
              .map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {r.clients?.prenom ?? ""} {r.clients?.nom ?? "Client"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.chambres?.nom} — du {formatDate(r.date_arrivee)} au{" "}
                      {formatDate(r.date_depart)}
                    </p>
                  </div>
                  <Badge variant="outline">{formatFCFA(r.prix_nuit)}</Badge>
                </div>
              ))}
            {data.reservations.filter((r) => r.date_arrivee >= jour && r.statut === "reservee")
              .length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune arrivée à venir.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
