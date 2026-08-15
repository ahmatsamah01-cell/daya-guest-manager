import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/AppLayout";
import { formatFCFA, formatDate, today } from "@/lib/format";
import { CalendarCheck, Wallet, TrendingDown, ArrowDown, ArrowUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [{ title: "Notifications — LE DAYA Hotel Manager" }],
  }),
  component: Notifications,
});

function Notifications() {
  const jour = today();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", jour],
    queryFn: async () => {
      const [resas, ops, deps] = await Promise.all([
        supabase
          .from("reservations")
          .select("*, clients(nom, prenom), chambres(nom)")
          .neq("statut", "annulee")
          .order("date_arrivee"),
        supabase.from("caisse_operations").select("*").gte("date_operation", `${jour}T00:00:00`),
        supabase.from("depenses").select("*").eq("date_depense", jour),
      ]);
      for (const r of [resas, ops, deps]) if (r.error) throw r.error;
      return {
        reservations: resas.data ?? [],
        operations: ops.data ?? [],
        depenses: deps.data ?? [],
      };
    },
  });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  const arrivees = data.reservations.filter((r) => r.date_arrivee === jour);
  const departs = data.reservations.filter((r) => r.date_depart === jour);

  const notifications: { texte: string; icon: typeof CalendarCheck; couleur: string }[] = [];

  arrivees.forEach((r) => {
    notifications.push({
      texte: `Check-in prévu : ${r.clients?.prenom ?? ""} ${r.clients?.nom ?? "Client"} — ${r.chambres?.nom ?? ""}`,
      icon: ArrowDown,
      couleur: "text-green-600",
    });
  });

  departs.forEach((r) => {
    notifications.push({
      texte: `Check-out prévu : ${r.clients?.prenom ?? ""} ${r.clients?.nom ?? "Client"} — ${r.chambres?.nom ?? ""}`,
      icon: ArrowUp,
      couleur: "text-orange-600",
    });
  });

  data.operations
    .filter((o) => o.sens === "entree")
    .forEach((o) => {
      notifications.push({
        texte: `Encaissement : ${formatFCFA(Number(o.montant))}${o.description ? " — " + o.description : ""}`,
        icon: Wallet,
        couleur: "text-blue-600",
      });
    });

  data.depenses.forEach((d) => {
    notifications.push({
      texte: `Dépense : ${formatFCFA(Number(d.montant))}${d.description ? " — " + d.description : ""}`,
      icon: TrendingDown,
      couleur: "text-red-500",
    });
  });

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={`Toutes les alertes du ${formatDate(jour)}`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aujourd'hui</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune notification aujourd'hui.</p>
          ) : (
            notifications.map((n, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border px-3 py-2 text-sm"
              >
                <n.icon className={`mt-0.5 size-4 shrink-0 ${n.couleur}`} />
                <span>{n.texte}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}