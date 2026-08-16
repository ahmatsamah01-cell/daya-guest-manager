import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BedDouble, CalendarCheck, Wallet, TrendingDown, Landmark, Users, ArrowDown, ArrowUp,ArrowUpRight,ArrowDownRight} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent,} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart, Cell } from "recharts";
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
    <Card className="group transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {titre}
        </CardTitle>
        <Icon className="size-5 text-primary transition-transform group-hover:scale-110" />
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
}
function StatCard({
  titre,
  valeur,
  detail,
  icon: Icon,
  couleur,
  to,
  variation,
}: {
  titre: string;
  valeur: string;
  detail?: string;
  icon: React.ComponentType<{ className?: string }>;
  couleur: string;
  to?: string;
  variation?: { texte: string; hausse: boolean } | null;
}) {
  const contenu = (
    <Card className="transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <CardContent className="flex items-start gap-3 p-4">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: couleur }}
        >
          <Icon className="size-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{titre}</p>
            {variation ? (
              <span
                className={`flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  variation.hausse
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                }`}
              >
                {variation.hausse ? (
                  <ArrowUpRight className="size-3" />
                ) : (
                  <ArrowDownRight className="size-3" />
                )}
                {variation.texte}
              </span>
            ) : null}
          </div>
          <p className="font-display text-2xl font-bold">{valeur}</p>
          {detail ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  if (to) {
    return (
      <Link to={to} className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary">
        {contenu}
      </Link>
    );
  }

  return contenu;
}

function Dashboard() {
  const jour = today();
  const [periode, setPeriode] = useState("jour");

  const dateDebut =
    periode === "semaine"
      ? new Date(new Date(jour).setDate(new Date(jour).getDate() - 6))
          .toISOString()
          .slice(0, 10)
      : periode === "mois"
        ? `${jour.slice(0, 7)}-01`
        : periode === "annee"
          ? `${jour.slice(0, 4)}-01-01`
          : jour;
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", jour, dateDebut],
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
    queryFn: async () => {
      const [chambres, resas, ops, deps, taxes, clients] = await Promise.all([
        supabase.from("chambres").select("*").eq("actif", true).order("nom"),
        supabase
          .from("reservations")
          .select("*, clients(nom, prenom), chambres(nom)")
          .neq("statut", "annulee")
          .order("date_arrivee"),
        supabase.from("caisse_operations").select("*").gte("date_operation", `${new Date(new Date(dateDebut).getTime() - 86400000).toISOString().slice(0, 10)}T00:00:00`),
        supabase.from("depenses").select("*").gte("date_depense", dateDebut).lte("date_depense", jour), 
        supabase.from("taxes_sejour").select("*").lte("date_nuitee", jour),
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
  const arrivees = data.reservations.filter(
  (r) => r.date_arrivee >= dateDebut && r.date_arrivee <= jour,
);
const departs = data.reservations.filter(
  (r) => r.date_depart >= dateDebut && r.date_depart <= jour,
);

const totalChambres = data.chambres.length;

const nuitsDisponibles =
  totalChambres *
  (Math.floor(
    (new Date(jour).getTime() - new Date(dateDebut).getTime()) /
      (1000 * 60 * 60 * 24),
  ) + 1);

const nuitsOccupees = data.reservations.reduce((total, r) => {
  const debutReservation = new Date(r.date_arrivee);
  const finReservation = new Date(r.date_depart);
  const debutPeriode = new Date(dateDebut);
  const finPeriode = new Date(new Date(jour).getTime() + 24 * 60 * 60 * 1000);

  const debutEffectif =
    debutReservation > debutPeriode ? debutReservation : debutPeriode;

  const finEffectif =
    finReservation < finPeriode ? finReservation : finPeriode;

  const nuits = Math.max(
    0,
    Math.floor(
      (finEffectif.getTime() - debutEffectif.getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );

  return total + nuits;
}, 0);

const tauxOccupation =
  nuitsDisponibles > 0
    ? Math.round((nuitsOccupees / nuitsDisponibles) * 100)
    : 0;

  const entrees = data.operations
    .filter((o) => o.sens === "entree")
    .reduce((s, o) => s + Number(o.montant), 0);
  const sorties = data.operations
    .filter((o) => o.sens === "sortie")
    .reduce((s, o) => s + Number(o.montant), 0);
  const soldeNet = entrees - sorties;
  const graphiqueFinancier = data.operations.reduce(
  (acc, o) => {
    const date = o.date_operation.slice(0, 10);
    const montant = Number(o.montant);

    if (!acc[date]) {
      acc[date] = { date, recettes: 0, sorties: 0 };
    }

    if (o.sens === "entree") {
      acc[date].recettes += montant;
    } else {
      acc[date].sorties += montant;
    }

    return acc;
  },
  {} as Record<string, { date: string; recettes: number; sorties: number }>,
);
  const donneesGraphique = Object.values(graphiqueFinancier).sort(
  (a, b) => a.date.localeCompare(b.date),
);
const chartConfig = {
  recettes: {
    label: "Recettes",
    color: "hsl(var(--primary))",
  },
  sorties: {
    label: "Sorties",
    color: "hsl(var(--destructive))",
  },
};
const hier = new Date(new Date(jour).getTime() - 86400000).toISOString().slice(0, 10);

const occupeesHier = new Set(
  data.reservations
    .filter((r) => r.date_arrivee <= hier && r.date_depart > hier)
    .map((r) => r.chambre_id),
);
const arriveesHier = data.reservations.filter((r) => r.date_arrivee === hier).length;
const departsHier = data.reservations.filter((r) => r.date_depart === hier).length;
const entreesHier = data.operations
  .filter((o) => o.sens === "entree" && o.date_operation.slice(0, 10) === hier)
  .reduce((s, o) => s + Number(o.montant), 0);
const enCoursHier = occupeesHier.size;

function variation(actuel: number, precedent: number): { texte: string; hausse: boolean } | null {
  if (precedent === 0 && actuel === 0) return null;
  if (precedent === 0) return { texte: "Nouveau", hausse: true };
  const pct = Math.round(((actuel - precedent) / precedent) * 100);
  return { texte: `${pct >= 0 ? "+" : ""}${pct}%`, hausse: pct >= 0 };
}

const varOccupation = periode === "jour" ? variation(occupees.size, occupeesHier.size) : null;
const varArrivees = periode === "jour" ? variation(arrivees.length, arriveesHier) : null;
const varDeparts = periode === "jour" ? variation(departs.length, departsHier) : null;
const varCA = periode === "jour" ? variation(entrees, entreesHier) : null;
const varEnCours = periode === "jour" ? variation(enCours.length, enCoursHier) : null;
const reservees = data.chambres.filter(
  (c) => !occupees.has(c.id) && data.reservations.some((r) => r.chambre_id === c.id && r.statut === "reservee"),
).length;
const disponibles = totalChambres - occupees.size - reservees;

const donneesDonut = [
  { name: "Disponible", value: disponibles, couleur: "#16a34a" },
  { name: "Réservée", value: reservees, couleur: "#f97316" },
  { name: "Occupée", value: occupees.size, couleur: "#dc2626" },
].filter((d) => d.value > 0);
const reservationsProches = data.reservations.filter(
    (r) =>
      r.statut === "reservee" &&
      r.date_arrivee > jour &&
      r.date_arrivee <= new Date(new Date(jour).getTime() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
  );

  const alertes: { texte: string; icon: typeof CalendarCheck; couleur: string }[] = [];

  reservationsProches.forEach((r) => {
    alertes.push({
      texte: `Chambre ${r.chambres?.nom ?? ""} réservée du ${formatDate(r.date_arrivee)} au ${formatDate(r.date_depart)}`,
      icon: CalendarCheck,
      couleur: "text-orange-500",
    });
  });

  if (arrivees.length === 0) {
    alertes.push({
      texte: "Aucune arrivée prévue aujourd'hui",
      icon: ArrowDown,
      couleur: "text-blue-500",
    });
  }

  if (departs.length === 0) {
    alertes.push({
      texte: "Aucun départ prévu aujourd'hui",
      icon: ArrowUp,
      couleur: "text-blue-500",
    });
  }
data.operations
    .filter((o) => o.sens === "entree" && o.date_operation.slice(0, 10) === jour)
    .forEach((o) => {
      alertes.push({
        texte: `Encaissement du jour : ${formatFCFA(Number(o.montant))}${o.motif ? " — " + o.motif : ""}`,
        icon: Wallet,
        couleur: "text-blue-600",
      });
    });

  data.depenses
    .filter((d) => d.date_depense === jour)
    .forEach((d) => {
      alertes.push({
        texte: `Dépense du jour : ${formatFCFA(Number(d.montant))}${d.libelle ? " — " + d.libelle : ""}`,
        icon: TrendingDown,
        couleur: "text-red-500",
      });
    });

  arrivees.forEach((r) => {
    alertes.push({
      texte: `Check-in prévu : ${r.clients?.prenom ?? ""} ${r.clients?.nom ?? "Client"} — ${r.chambres?.nom ?? ""}`,
      icon: ArrowDown,
      couleur: "text-green-600",
    });
  });

  departs.forEach((r) => {
    alertes.push({
      texte: `Check-out prévu : ${r.clients?.prenom ?? ""} ${r.clients?.nom ?? "Client"} — ${r.chambres?.nom ?? ""}`,
      icon: ArrowUp,
      couleur: "text-orange-600",
    });
  });
const activiteRecente = [...data.reservations]
    .filter((r) => r.created_at)
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 5)
    .map((r) => ({
      texte: `Réservation créée — ${r.clients?.prenom ?? ""} ${r.clients?.nom ?? "Client"} (${r.chambres?.nom ?? ""})`,
      heure: r.created_at
        ? new Date(r.created_at).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
    }));
  const depensesPeriode = data.depenses.reduce((s, d) => s + Number(d.montant), 0);
  const JOUR_MS = 24 * 60 * 60 * 1000;
  const debutP = new Date(dateDebut).getTime();
  const finP = new Date(jour).getTime() + JOUR_MS;
  const taxeMois = data.taxes.reduce((s, t) => {
    const debutT = new Date(t.date_nuitee).getTime();
    const finT = debutT + Math.max(1, Number(t.nb_nuits) || 1) * JOUR_MS;
    const nuits = Math.max(
      0,
      Math.round((Math.min(finT, finP) - Math.max(debutT, debutP)) / JOUR_MS),
    );
    if (nuits === 0) return s;
    const unitaire =
      Number(t.montant_unitaire) ||
      Number(t.montant_total) / Math.max(1, Number(t.nb_nuits) || 1);
    return s + unitaire * nuits;
  }, 0);


  return (
    <div>
      <div className="mb-6 overflow-hidden rounded-xl border bg-card shadow-sm">
  <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-4">
      <div className="rounded-lg bg-white p-2">
        <BrandLogo className="max-h-16 sm:max-h-20" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">Bienvenue,</p>
        <p className="font-display text-2xl font-bold sm:text-3xl">
          LE DAYA Guest House
        </p>
        <p className="text-sm italic text-muted-foreground">{SLOGAN}</p>
      </div>
    </div>

    <div className="relative h-32 w-full overflow-hidden rounded-lg bg-gradient-to-br from-red-900 via-red-800 to-stone-900 sm:h-36 sm:max-w-md">
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="flex flex-col items-center gap-2 text-white/90">
      <BedDouble className="size-10" />
      <span className="text-xs font-medium uppercase tracking-wide">
        Réception
      </span>
    </div>
  </div>
</div>
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
  <StatCard
    titre="Occupation"
    valeur={`${occupees.size}/${totalChambres}`}
    detail={`${totalChambres - occupees.size} chambre(s) disponible(s)`}
    icon={BedDouble}
    couleur="#166534"
    to="/chambres"
    variation={varOccupation}
  />
  <StatCard
    titre="Arrivées du jour"
    valeur={String(arrivees.length)}
    detail={arrivees.length === 0 ? "Aucune arrivée" : "Arrivée(s) prévue(s)"}
    icon={CalendarCheck}
    couleur="#ea580c"
    to="/reservations"
    variation={varArrivees}
  />
  <StatCard
    titre="Départs du jour"
    valeur={String(departs.length)}
    detail={departs.length === 0 ? "Aucun départ" : "Départ(s) prévu(s)"}
    icon={CalendarCheck}
    couleur="#9333ea"
    to="/reservations"
    variation={varDeparts}
  />
  <StatCard
    titre="CA du jour"
    valeur={formatFCFA(entrees)}
    detail="Chiffre d'affaires"
    icon={Wallet}
    couleur="#2563eb"
    to="/caisse"
    variation={varCA}
  />
  <StatCard
    titre="Réservations en cours"
    valeur={String(enCours.length)}
    detail={`${enCours.length} chambre(s) réservée(s)`}
    icon={Users}
    couleur="#16a34a"
    to="/reservations"
    variation={varEnCours}
  />
</div>
<Card className="mt-6">
  <CardHeader>
    <CardTitle className="text-base">Évolution financière</CardTitle>
  </CardHeader>
  <CardContent>
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={donneesGraphique}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="recettes" fill="var(--color-recettes)" radius={4} />
        <Bar dataKey="sorties" fill="var(--color-sorties)" radius={4} />
      </BarChart>
    </ChartContainer>
  </CardContent>

</Card>
<Card className="mt-6 overflow-hidden border-none bg-gradient-to-br from-card to-muted/50 shadow-md">
  <CardHeader>
    <CardTitle className="text-base">Occupation des chambres</CardTitle>
  </CardHeader>
  <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
    <div className="relative h-[180px] w-[180px]">
      <ChartContainer config={{}} className="h-full w-full drop-shadow-[0_0_18px_rgba(220,38,38,0.25)]">
        <PieChart>
          <Pie
            data={donneesDonut}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            cornerRadius={6}
            animationDuration={800}
          >
            {donneesDonut.map((entry, i) => (
              <Cell key={i} fill={entry.couleur} stroke="none" />
            ))}
          </Pie>
          <ChartTooltip content={<ChartTooltipContent />} />
        </PieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-bold">
          {totalChambres > 0 ? Math.round((occupees.size / totalChambres) * 100) : 0}%
        </span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Occupé
        </span>
      </div>
    </div>    <div className="space-y-2">
      {donneesDonut.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="size-3 rounded-full" style={{ backgroundColor: d.couleur }} />
          <span className="text-muted-foreground">{d.name}</span>
          <span className="font-semibold">{d.value}</span>
        </div>
      ))}
      {donneesDonut.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune chambre enregistrée.</p>
      ) : null}
    </div>
  </CardContent>
</Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
       <Card className="lg:col-span-1">
  <CardHeader>
    <CardTitle className="text-base">État des chambres</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-green-600" /> Disponible
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-orange-500" /> Réservée
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-red-600" /> Occupée
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-blue-500" /> Nettoyage
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-purple-600" /> Maintenance
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-gray-400" /> Hors service
      </span>
    </div>

    <div className="space-y-2">
      {data.chambres.slice(0, 5).map((c) => {
        const occupee = occupees.has(c.id);
        const reservee = data.reservations.some(
          (r) => r.chambre_id === c.id && r.statut === "reservee",
        );
        const statut = occupee ? "Occupée" : reservee ? "Réservée" : "Disponible";
        const couleur = occupee
          ? "text-red-600"
          : reservee
            ? "text-orange-500"
            : "text-green-600";

        return (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-lg border px-3 py-2"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{c.nom}</span>
              <span className="text-xs text-muted-foreground">{c.type}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-xs font-medium ${couleur}`}>{statut}</span>
              <span className="text-xs text-muted-foreground">
                {formatFCFA(c.prix_nuit)}/nuit
              </span>
            </div>
          </div>
        );
      })}
      {data.chambres.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune chambre enregistrée.</p>
      ) : null}
    </div>

    {data.chambres.length > 5 ? (
      <Link
        to="/chambres"
        className="mt-3 block text-center text-sm text-primary hover:underline"
      >
        Voir toutes les chambres →
      </Link>
    ) : null}
  </CardContent>
</Card>

       <Card>
  <CardHeader>
    <CardTitle className="text-base">Arrivées du jour</CardTitle>
  </CardHeader>
  <CardContent>
    {arrivees.length === 0 ? (
      <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-green-100">
          <ArrowDown className="size-7 text-green-600" />
        </div>
        <p className="font-medium">Aucune arrivée prévue</p>
        <p className="text-sm text-muted-foreground">Aucune arrivée aujourd'hui</p>
      </div>
    ) : (
      <div className="space-y-2">
        {arrivees.slice(0, 8).map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-lg border px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium">
                {r.clients?.prenom ?? ""} {r.clients?.nom ?? "Client"}
              </p>
              <p className="text-xs text-muted-foreground">
                {r.chambres?.nom} — dès {formatDate(r.date_arrivee)}
              </p>
            </div>
            <Badge variant="outline">{formatFCFA(r.prix_nuit)}</Badge>
          </div>
        ))}
      </div>
    )}
    <Link
      to="/reservations"
      className="mt-3 block text-center text-sm text-primary hover:underline"
    >
      Voir toutes les arrivées →
    </Link>
  </CardContent>
</Card>

<Card>
  <CardHeader>
    <CardTitle className="text-base">Départs du jour</CardTitle>
  </CardHeader>
  <CardContent>
    {departs.length === 0 ? (
      <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-orange-100">
          <ArrowUp className="size-7 text-orange-600" />
        </div>
        <p className="font-medium">Aucun départ prévu</p>
        <p className="text-sm text-muted-foreground">Aucun départ aujourd'hui</p>
      </div>
    ) : (
      <div className="space-y-2">
        {departs.slice(0, 8).map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-lg border px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium">
                {r.clients?.prenom ?? ""} {r.clients?.nom ?? "Client"}
              </p>
              <p className="text-xs text-muted-foreground">
                {r.chambres?.nom} — jusqu'au {formatDate(r.date_depart)}
              </p>
            </div>
            <Badge variant="outline">{formatFCFA(r.prix_nuit)}</Badge>
          </div>
        ))}
      </div>
    )}
    <Link
      to="/reservations"
      className="mt-3 block text-center text-sm text-primary hover:underline"
    >
      Voir tous les départs →
    </Link>
  </CardContent>
</Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
       <Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <CardTitle className="text-base">Alertes</CardTitle>
    <Badge variant="destructive">{alertes.length}</Badge>
  </CardHeader>
  <CardContent className="space-y-3">
    {alertes.length === 0 ? (
      <p className="text-sm text-muted-foreground">Aucune alerte pour le moment.</p>
    ) : (
      alertes.map((a, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <a.icon className={`mt-0.5 size-4 shrink-0 ${a.couleur}`} />
          <span>{a.texte}</span>
        </div>
      ))
    )}
    <Link
      to="/reservations"
      className="block pt-1 text-center text-sm text-primary hover:underline"
    >
      Voir toutes les alertes →
    </Link>
  </CardContent>
</Card>

        <Card>
  <CardHeader>
    <CardTitle className="text-base">Activité récente</CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    {activiteRecente.length === 0 ? (
      <p className="text-sm text-muted-foreground">
        Aucune activité récente enregistrée.
      </p>
    ) : (
      activiteRecente.map((a, i) => (
        <div key={i} className="flex items-center justify-between text-sm">
          <span>{a.texte}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{a.heure}</span>
        </div>
      ))
    )}
    <Link
      to="/reservations"
      className="block pt-1 text-center text-sm text-primary hover:underline"
    >
      Voir toute l'activité →
    </Link>
  </CardContent>
</Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Link
              to="/reservations"
              className="flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-center text-xs hover:bg-accent"
            >
              <CalendarCheck className="size-4" />
              Nouvelle réservation
            </Link>
            <Link
              to="/clients"
              className="flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-center text-xs hover:bg-accent"
            >
              <Users className="size-4" />
              Nouveau client
            </Link>
            <Link
              to="/caisse"
              className="flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-center text-xs hover:bg-accent"
            >
              <Wallet className="size-4" />
              Encaissement
            </Link>
            <Link
              to="/depenses"
              className="flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-center text-xs hover:bg-accent"
            >
              <TrendingDown className="size-4" />
              Nouvelle dépense
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
