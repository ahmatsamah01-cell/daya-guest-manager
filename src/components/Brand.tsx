import { cn } from "@/lib/utils";

export const LOGO_URL = "/IMG_20260812_225755.png";
export const SLOGAN = "Notre priorité, votre satisfaction";

/** Logo officiel — proportions d'origine strictement conservées (largeur auto). */
export function BrandLogo({
  className,
  alt = "LE DAYA Guest House",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={LOGO_URL}
      alt={alt}
      className={cn("h-auto w-auto max-w-full object-contain", className)}
      loading="eager"
      decoding="async"
    />
  );
}

/** En-tête professionnel pour les documents imprimables (factures, reçus, PCS, rapports). */
export function DocumentHeader({
  titre,
  sousTitre,
  etablissement,
}: {
  titre: string;
  sousTitre?: string | undefined;
  etablissement?: {
    nom?: string | null;
    ville?: string | null;
    telephone?: string | null;
    email?: string | null;
  } | null | undefined;
}) {
  return (
    <header className="mb-4 border-b pb-4">
      <div className="flex items-start justify-between gap-4">
        <BrandLogo className="max-h-16 sm:max-h-20" />
        <div className="text-right text-[11px] leading-tight text-muted-foreground">
          <p className="font-medium text-foreground">{etablissement?.nom ?? "LE DAYA Guest House"}</p>
          {etablissement?.ville ? <p>{etablissement.ville}</p> : null}
          {etablissement?.telephone ? <p>Tél. {etablissement.telephone}</p> : null}
          {etablissement?.email ? <p>{etablissement.email}</p> : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">{titre}</h2>
        {sousTitre ? <p className="text-xs text-muted-foreground">{sousTitre}</p> : null}
      </div>
      <p className="mt-1 text-[10px] tracking-wide text-muted-foreground italic">{SLOGAN}</p>
    </header>
  );
}
