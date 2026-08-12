export function formatFCFA(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} FCFA`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function nbNuits(arrivee: string, depart: string): number {
  const a = new Date(arrivee).getTime();
  const d = new Date(depart).getTime();
  return Math.max(1, Math.round((d - a) / 86400000));
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
