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
import {
  BedDouble,
  CalendarCheck,
  Wallet,
  TrendingDown,
  Users,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  CartesianGrid,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
  Area,
  AreaChart,
} from "recharts";
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

// ============================================================
// COMPOSANT STAT CARD - HARMONISÉ
// ============================================================
function StatCard({
  titre,
  valeur,
  detail,
  icon: Icon,
  to,
  variation,
}: {
  titre: string;
  valeur: string;
  detail?: string;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  variation?: { texte: string; hausse: boolean } | null;
}) {
  const contenu = (
    <Card className="group h-full transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/70 backdrop-blur-xl border border-white/20 shadow-md">
      <CardContent className="flex h-full items-start gap-4 p-5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/25 transition-transform group-hover:scale-110">
          <Icon className="size-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-500">{titre}</p>
            {variation ? (
              <span
                className={`flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  variation.hausse
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
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
          <p className="font-display text-2xl font-bold text-slate-900 mt-1">
            {valeur}
          </p>
          {detail ? (
            <p className="mt-0.5 text-xs text-slate-400">{detail}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  if (to) {
    return (
      <Link to={to} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 rounded-2xl">
        {contenu}
      </Link>
    );
  }

  return contenu;
}

// ============================================================
// COMPOSANT SECTION HEADER
// ============================================================
function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      {action}
    </div>
  );
}

// ============================================================
// DASHBOARD PRINCIPAL
// ============================================================
function Dashboard() {
  const jour = today();
  const debutMoisDernierGlobal = new Date(
    new Date(jour).getFullYear(),
    new Date(jour).getMonth() - 1,
    1
  )
    .toISOString()
    .slice(0, 10);
  const finMoisDernierGlobal = new Date(
    new Date(jour).getFullYear(),
    new Date(jour).getMonth(),
    0
  )
    .toISOString()
    .slice(0, 10);
  const [periode, setPeriode] = useState("jour");
  const [rapportPeriode, setRapportPeriode] = useState("mois_actuel");
  const [evolutionVue, setEvolutionVue] = useState<"mois" | "annee">("mois");

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
        supabase
          .from("caisse_operations")
          .select("*")
          .gte(
            "date_operation",
            `${new Date(new Date(dateDebut).getTime() - 86400000)
              .toISOString()
              .slice(0, 10)}T00:00:00`
          ),
        supabase
          .from("depenses")
          .select("*")
          .gte("date_depense", dateDebut)
          .lte("date_depense", jour),
        supabase.from("taxes_sejour").select("*").lte("date_nuitee", jour),
        supabase.from("clients").select("id"),
      ]);
      for (const r of [chambres, resas, ops, deps, taxes, clients])
        if (r.error) throw r.error;
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

  const { data: caMoisDernierData } = useQuery({
    queryKey: ["ca-mois-dernier", jour],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caisse_operations")
        .select("montant")
        .eq("sens", "entree")
        .gte("date_operation", `${debutMoisDernierGlobal}T00:00:00`)
        .lte("date_operation", `${finMoisDernierGlobal}T23:59:59`);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: evolutionData } = useQuery({
    queryKey: ["evolution-ca", evolutionVue, jour],
    queryFn: async () => {
      const depuis =
        evolutionVue === "mois"
          ? new Date(
              new Date(jour).getFullYear(),
              new Date(jour).getMonth() - 11,
              1
            )
              .toISOString()
              .slice(0, 10)
          : `${new Date(jour).getFullYear() - 5}-01-01`;
      const { data, error } = await supabase
        .from("caisse_operations")
        .select("montant, date_operation")
        .eq("sens", "entree")
        .gte("date_operation", `${depuis}T00:00:00`);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // CALCULS
  // ============================================================
  const enCours = data.reservations.filter(
    (r) =>
      r.statut === "en_cours" ||
      (r.date_arrivee <= jour && r.date_depart > jour)
  );
  const occupees = new Set(enCours.map((r) => r.chambre_id));
  const arrivees = data.reservations.filter(
    (r) => r.date_arrivee >= dateDebut && r.date_arrivee <= jour
  );
  const departs = data.reservations.filter(
    (r) => r.date_depart >= dateDebut && r.date_depart <= jour
  );

  const totalChambres = data.chambres.length;

  const nuitsDisponibles =
    totalChambres *
    (Math.floor(
      (new Date(jour).getTime() - new Date(dateDebut).getTime()) /
        (1000 * 60 * 60 * 24)
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
          (1000 * 60 * 60 * 24)
      )
    );

    return total + nuits;
  }, 0);

  const hier = new Date(new Date(jour).getTime() - 86400000)
    .toISOString()
    .slice(0, 10);

  const occupeesHier = new Set(
    data.reservations
      .filter((r) => r.date_arrivee <= hier && r.date_depart > hier)
      .map((r) => r.chambre_id)
  );
  const arriveesHier = data.reservations.filter(
    (r) => r.date_arrivee === hier
  ).length;
  const departsHier = data.reservations.filter((r) => r.date_depart === hier)
    .length;
  const enCoursHier = occupeesHier.size;

  const debutMoisActuel = `${jour.slice(0, 7)}-01`;
  const caMoisActuel = data.operations
    .filter(
      (o) =>
        o.sens === "entree" &&
        o.date_operation.slice(0, 10) >= debutMoisActuel
    )
    .reduce((s, o) => s + Number(o.montant), 0);

  const caMoisDernier = (caMoisDernierData ?? []).reduce(
    (s, o) => s + Number(o.montant),
    0
  );

  function variation(actuel: number, precedent: number): {
    texte: string;
    hausse: boolean;
  } | null {
    if (precedent === 0 && actuel === 0) return null;
    if (precedent === 0) return { texte: "Nouveau", hausse: true };
    const pct = Math.round(((actuel - precedent) / precedent) * 100);
    return { texte: `${pct >= 0 ? "+" : ""}${pct}%`, hausse: pct >= 0 };
  }

  const varOccupation =
    periode === "jour" ? variation(occupees.size, occupeesHier.size) : null;
  const varArrivees =
    periode === "jour" ? variation(arrivees.length, arriveesHier) : null;
  const varDeparts =
    periode === "jour" ? variation(departs.length, departsHier) : null;
  const varCA = variation(caMoisActuel, caMoisDernier);
  const varEnCours =
    periode === "jour" ? variation(enCours.length, enCoursHier) : null;

  const maintenant = new Date(jour);
  let rapportDebut: Date;
  let rapportFin: Date;
  let rapportLabel: string;

  if (rapportPeriode === "mois_actuel") {
    rapportDebut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    rapportFin = new Date(
      maintenant.getFullYear(),
      maintenant.getMonth() + 1,
      1
    );
    rapportLabel = maintenant.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  } else if (rapportPeriode === "mois_dernier") {
    rapportDebut = new Date(
      maintenant.getFullYear(),
      maintenant.getMonth() - 1,
      1
    );
    rapportFin = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    rapportLabel = rapportDebut.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  } else if (rapportPeriode === "annee_actuelle") {
    rapportDebut = new Date(maintenant.getFullYear(), 0, 1);
    rapportFin = new Date(maintenant.getFullYear() + 1, 0, 1);
    rapportLabel = String(maintenant.getFullYear());
  } else {
    rapportDebut = new Date(maintenant.getFullYear() - 1, 0, 1);
    rapportFin = new Date(maintenant.getFullYear(), 0, 1);
    rapportLabel = String(maintenant.getFullYear() - 1);
  }

  const nuitsVenduesPeriode = data.reservations.reduce((total, r) => {
    const debutR = new Date(r.date_arrivee);
    const finR = new Date(r.date_depart);
    const debutEff = debutR > rapportDebut ? debutR : rapportDebut;
    const finEff = finR < rapportFin ? finR : rapportFin;
    const nuits = Math.max(
      0,
      Math.round(
        (finEff.getTime() - debutEff.getTime()) / (1000 * 60 * 60 * 24)
      )
    );
    return total + nuits;
  }, 0);

  const joursDansRapport = Math.max(
    1,
    Math.round((rapportFin.getTime() - rapportDebut.getTime()) / 86400000)
  );

  const nuitsDisponiblesRapport = totalChambres * joursDansRapport;
  const tauxOccupationRapport =
    nuitsDisponiblesRapport > 0
      ? Math.round((nuitsVenduesPeriode / nuitsDisponiblesRapport) * 100)
      : 0;

  const groupesCA: Record<string, number> = {};
  (evolutionData ?? []).forEach((o) => {
    const d = o.date_operation.slice(0, 10);
    const cle = evolutionVue === "mois" ? d.slice(0, 7) : d.slice(0, 4);
    groupesCA[cle] = (groupesCA[cle] ?? 0) + Number(o.montant);
  });

  const evolutionCA = Object.entries(groupesCA)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cle, montant]) => ({
      label:
        evolutionVue === "mois"
          ? new Date(`${cle}-01`).toLocaleDateString("fr-FR", {
              month: "short",
              year: "2-digit",
            })
          : cle,
      montant,
    }));

  const activiteRecente = [...data.reservations]
    .filter((r) => r.created_at)
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 5)
    .map((r) => ({
      texte: `${r.clients?.prenom ?? ""} ${r.clients?.nom ?? "Client"} — ${
        r.chambres?.nom ?? ""
      }`,
      heure: r.created_at
        ? new Date(r.created_at).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
      statut: r.statut,
    }));

  const statutColors: Record<string, string> = {
    reservee: "bg-amber-500",
    en_cours: "bg-emerald-500",
    terminee: "bg-blue-500",
    annulee: "bg-red-500",
  };

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════
          EN-TÊTE AVEC BIENVENUE
          ═══════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {formatDate(jour)} — Vue d'ensemble de votre activité
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-red-500/10 text-red-500 border-red-200/30 px-3 py-1.5 text-xs font-medium">
            <span className="size-1.5 rounded-full bg-red-500 animate-pulse mr-1.5" />
            En direct
          </Badge>
          <Select value={periode} onValueChange={setPeriode}>
            <SelectTrigger className="w-[140px] bg-white/70 backdrop-blur-xl border-white/20 rounded-xl">
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
      </div>

      {/* ═══════════════════════════════════════════════════════
          KPI CARDS - 5 STATISTIQUES
          ═══════════════════════════════════════════════════════ */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          titre="Occupation"
          valeur={`${occupees.size}/${totalChambres}`}
          detail={`${totalChambres - occupees.size} disponible(s)`}
          icon={BedDouble}
          to="/chambres"
          variation={varOccupation}
        />
        <StatCard
          titre="Arrivées"
          valeur={String(arrivees.length)}
          detail={arrivees.length === 0 ? "Aucune" : "Prévue(s)"}
          icon={ArrowDown}
          to="/reservations"
          variation={varArrivees}
        />
        <StatCard
          titre="Départs"
          valeur={String(departs.length)}
          detail={departs.length === 0 ? "Aucun" : "Prévu(s)"}
          icon={ArrowUp}
          to="/reservations"
          variation={varDeparts}
        />
        <StatCard
          titre="CA du mois"
          valeur={formatFCFA(caMoisActuel)}
          detail={`vs ${formatFCFA(caMoisDernier)}`}
          icon={Wallet}
          to="/caisse"
          variation={varCA}
        />
        <StatCard
          titre="En cours"
          valeur={String(enCours.length)}
          detail={`${enCours.length} réservation(s)`}
          icon={Users}
          to="/reservations"
          variation={varEnCours}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════
          GRAPHIQUE CA + NUITS VENDUES
          ═══════════════════════════════════════════════════════ */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Évolution CA */}
        <Card className="bg-white/70 backdrop-blur-xl border border-white/20 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold text-slate-800">
              Évolution du CA
            </CardTitle>
            <Select
              value={evolutionVue}
              onValueChange={(v) => setEvolutionVue(v as "mois" | "annee")}
            >
              <SelectTrigger className="w-[120px] bg-white/50 border-white/30 rounded-xl text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mois">Par mois</SelectItem>
                <SelectItem value="annee">Par année</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ montant: { label: "CA", color: "#ef4444" } }}
              className="h-[220px] w-full"
            >
              <AreaChart
                data={evolutionCA}
                margin={{ left: 0, right: 12, top: 8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="caGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  fontSize={11}
                  tick={{ fill: "#94A3B8" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                  fontSize={11}
                  width={35}
                  tick={{ fill: "#94A3B8" }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatFCFA(Number(value))}
                      className="bg-slate-900/95 text-white border-slate-800 rounded-xl"
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="montant"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  fill="url(#caGradient)"
                  animationDuration={900}
                  dot={{ r: 3, fill: "#ef4444", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ChartContainer>
            {evolutionCA.length === 0 && (
              <p className="mt-2 text-center text-sm text-slate-400">
                Aucune donnée pour cette période.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Nuits vendues */}
        <Card className="bg-white/70 backdrop-blur-xl border border-white/20 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold text-slate-800">
              Nuits vendues
            </CardTitle>
            <Select value={rapportPeriode} onValueChange={setRapportPeriode}>
              <SelectTrigger className="w-[140px] bg-white/50 border-white/30 rounded-xl text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mois_actuel">Ce mois</SelectItem>
                <SelectItem value="mois_dernier">Mois dernier</SelectItem>
                <SelectItem value="annee_actuelle">Cette année</SelectItem>
                <SelectItem value="annee_derniere">Année dernière</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
              <div className="relative h-[160px] w-[160px]">
                <ChartContainer config={{}} className="h-full w-full">
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: "Vendues",
                          value: nuitsVenduesPeriode,
                          couleur: "#ef4444",
                        },
                        {
                          name: "Disponibles",
                          value: Math.max(
                            0,
                            nuitsDisponiblesRapport - nuitsVenduesPeriode
                          ),
                          couleur: "#E5E7EB",
                        },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={72}
                      paddingAngle={2}
                      cornerRadius={4}
                      animationDuration={800}
                    >
                      <Cell fill="#ef4444" stroke="none" />
                      <Cell fill="#E5E7EB" stroke="none" />
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-2xl font-bold text-slate-900">
                    {tauxOccupationRapport}%
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">
                    Occupation
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="font-display text-2xl font-bold text-slate-900">
                    {nuitsVenduesPeriode}{" "}
                    <span className="text-base font-normal text-slate-400">
                      / {nuitsDisponiblesRapport}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400 capitalize">
                    nuit(s) — {rapportLabel}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="size-2.5 rounded-full bg-red-500" />
                  <span className="text-slate-500">Vendues</span>
                  <span className="font-semibold text-slate-700">
                    {nuitsVenduesPeriode}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="size-2.5 rounded-full bg-gray-300" />
                  <span className="text-slate-500">Disponibles</span>
                  <span className="font-semibold text-slate-700">
                    {Math.max(0, nuitsDisponiblesRapport - nuitsVenduesPeriode)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════
          ÉTAT DES CHAMBRES + ACTIVITÉ RÉCENTE + ACTIONS
          ═══════════════════════════════════════════════════════ */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* État des chambres */}
        <Card className="bg-white/70 backdrop-blur-xl border border-white/20 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold text-slate-800">
              État des chambres
            </CardTitle>
            <div className="flex size-9 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
              <BedDouble className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap gap-2 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-emerald-500" /> Dispo
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-amber-500" /> Réservée
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-red-500" /> Occupée
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-blue-400" /> Nettoyage
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-purple-500" /> Maintenance
              </span>
            </div>

            <div className="space-y-1.5">
              {data.chambres.slice(0, 5).map((c) => {
                const occupee = occupees.has(c.id);
                const reservee = data.reservations.some(
                  (r) => r.chambre_id === c.id && r.statut === "reservee"
                );
                const statut = occupee
                  ? "Occupée"
                  : reservee
                  ? "Réservée"
                  : "Disponible";
                const couleur = occupee
                  ? "text-red-500"
                  : reservee
                  ? "text-amber-500"
                  : "text-emerald-500";
                const bgCouleur = occupee
                  ? "bg-red-50"
                  : reservee
                  ? "bg-amber-50"
                  : "bg-emerald-50";

                return (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 ${bgCouleur} transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-700">
                        {c.nom}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {c.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium ${couleur}`}>
                        {statut}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatFCFA(c.prix_nuit)}
                      </span>
                    </div>
                  </div>
                );
              })}
              {data.chambres.length === 0 && (
                <p className="text-sm text-slate-400">Aucune chambre.</p>
              )}
            </div>

            {data.chambres.length > 5 && (
              <Link
                to="/chambres"
                className="mt-3 flex items-center justify-center gap-1 text-sm text-red-500 hover:text-red-600 transition-colors"
              >
                Voir toutes <Eye className="size-3.5" />
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Activité récente */}
        <Card className="bg-white/70 backdrop-blur-xl border border-white/20 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold text-slate-800">
              Activité récente
            </CardTitle>
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <Users className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {activiteRecente.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                Aucune activité récente
              </p>
            ) : (
              activiteRecente.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`size-2 rounded-full ${
                        statutColors[a.statut] || "bg-slate-300"
                      }`}
                    />
                    <span className="text-sm text-slate-700 truncate">
                      {a.texte}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {a.heure}
                  </span>
                </div>
              ))
            )}
            <Link
              to="/reservations"
              className="flex items-center justify-center gap-1 text-sm text-red-500 hover:text-red-600 transition-colors pt-1"
            >
              Voir tout <Eye className="size-3.5" />
            </Link>
          </CardContent>
        </Card>

        {/* Actions rapides */}
        <Card className="bg-white/70 backdrop-blur-xl border border-white/20 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold text-slate-800">
              Actions rapides
            </CardTitle>
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Plus className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Link
              to="/reservations"
              className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 px-2 py-4 text-center hover:bg-red-50/50 hover:border-red-200/30 transition-all group"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                <CalendarCheck className="size-4" />
              </div>
              <span className="text-xs font-medium text-slate-600">
                Réservation
              </span>
            </Link>
            <Link
              to="/clients"
              className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 px-2 py-4 text-center hover:bg-blue-50/50 hover:border-blue-200/30 transition-all group"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <Users className="size-4" />
              </div>
              <span className="text-xs font-medium text-slate-600">
                Client
              </span>
            </Link>
            <Link
              to="/caisse"
              className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 px-2 py-4 text-center hover:bg-emerald-50/50 hover:border-emerald-200/30 transition-all group"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <Wallet className="size-4" />
              </div>
              <span className="text-xs font-medium text-slate-600">
                Encaissement
              </span>
            </Link>
            <Link
              to="/depenses"
              className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 px-2 py-4 text-center hover:bg-amber-50/50 hover:border-amber-200/30 transition-all group"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <TrendingDown className="size-4" />
              </div>
              <span className="text-xs font-medium text-slate-600">
                Dépense
              </span>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}