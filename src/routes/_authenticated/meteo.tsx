import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Cloud, CloudFog, CloudLightning, CloudRain, Droplets, MapPin, Sun, Wind } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/AppLayout";

export const Route = createFileRoute("/_authenticated/meteo")({
  head: () => ({
    meta: [{ title: "Météo — LE DAYA Hotel Manager" }],
  }),
  component: MeteoPage,
});

function iconMeteo(code: number) {
  if (code === 0) return { Icon: Sun, label: "Ensoleillé" };
  if ([1, 2, 3].includes(code)) return { Icon: Cloud, label: "Nuageux" };
  if ([45, 48].includes(code)) return { Icon: CloudFog, label: "Brumeux" };
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
    return { Icon: CloudRain, label: "Pluvieux" };
  }
  if ([95, 96, 99].includes(code)) return { Icon: CloudLightning, label: "Orageux" };
  return { Icon: Cloud, label: "Variable" };
}

function MeteoPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["meteo-detail-port-gentil"],
    queryFn: async () => {
      const res = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=-0.72&longitude=8.78&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Africa%2FLibreville&forecast_days=3",
      );
      if (!res.ok) throw new Error("Erreur météo");
      return res.json();
    },
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement de la météo…</p>;
  }

  if (error || !data?.current || !data?.daily) {
    return <p className="text-sm text-muted-foreground">Impossible de charger la météo.</p>;
  }

  const current = data.current;
  const daily = data.daily;
  const { Icon, label } = iconMeteo(current.weather_code);

  const jours = (daily.time ?? []).map((date: string, index: number) => ({
    date,
    max: daily.temperature_2m_max?.[index],
    min: daily.temperature_2m_min?.[index],
    pluie: daily.precipitation_sum?.[index],
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Météo"
        description="Prévisions météo pour Port-Gentil, utiles au suivi opérationnel de l'établissement."
      />

      <Card className="group transition-all duration-200 hover:-translate-y-1 hover:shadow-lg bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Conditions actuelles</CardTitle>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              Port-Gentil
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-accent/40 px-4 py-3">
            <Icon className="size-8 text-amber-500" />
            <div>
              <p className="text-xl font-semibold">{Math.round(current.temperature_2m)}°C</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Ressenti</p>
            <p className="mt-1 text-2xl font-semibold">{Math.round(current.apparent_temperature)}°C</p>
          </div>
          <div className="rounded-xl border p-4">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Droplets className="size-4" />
              Humidité
            </p>
            <p className="mt-1 text-2xl font-semibold">{current.relative_humidity_2m}%</p>
          </div>
          <div className="rounded-xl border p-4">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wind className="size-4" />
              Vent
            </p>
            <p className="mt-1 text-2xl font-semibold">{Math.round(current.wind_speed_10m)} km/h</p>
          </div>
        </CardContent>
      </Card>

      <Card className="group transition-all duration-200 hover:-translate-y-1 hover:shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Prévisions sur 3 jours</CardTitle>
          <div className="flex size-10 items-center justify-center rounded-full bg-blue-600 shadow-[0_0_16px_rgba(37,99,235,0.5)] transition-transform group-hover:scale-110">
            <Sun className="size-5 text-white" />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {jours.map((jour) => (
            <div key={jour.date} className="rounded-xl border p-4">
              <p className="text-sm font-medium capitalize">
                {new Date(jour.date).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p>Max : <span className="font-medium text-foreground">{Math.round(jour.max)}°C</span></p>
                <p>Min : <span className="font-medium text-foreground">{Math.round(jour.min)}°C</span></p>
                <p>Pluie : <span className="font-medium text-foreground">{jour.pluie ?? 0} mm</span></p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}