import "./facture-document.css";
export type LigneHebergement = {
  periode: string;
  nuitees: number | string;
  chambre: string;
  prixUnitaire: number;
  prixTotal: number;
};

export type LigneBuanderie = {
  detail: string; // ex: "11.500 XAF + 7.500 XAF"
  total: number;
};

export type FactureDocumentData = {
  numero: string;
  clientNom: string;
  periodeLabel: string; // ex: "18/07 au 19/07/2026"
  lignesHebergement: LigneHebergement[];
  reliquat?: number;
  totalHebergement: number;
  buanderie?: LigneBuanderie;
  totalGeneral: number;
  chequeBeneficiaire?: string;
  ville: string;
  dateEmission: string; // déjà formatée, ex: "17 juillet 2026"
  etablissement: {
    nom: string;
    adresse: string;
    telephone: string;
    email: string;
    rccm: string;
    nif: string;
    banque: string;
    compte: string;
    cle: string;
  };
  logoUrl: string;
};

function formatXAF(n: number): string {
  return Math.round(n).toLocaleString("fr-FR").replace(/\s/g, ".") + " XAF";
}

export function FactureDocument({ data }: { data: FactureDocumentData }) {
  return (
    <div className="facture-a4">
      <div className="facture-logo-top">
        <img src={data.logoUrl} alt="Le Daya Guest House" />
      </div>

      <p className="facture-titre-etab">{data.etablissement.nom}</p>

      <p className="facture-ligne">
        <span className="facture-underline">Client</span> :{" "}
        <span className="facture-bold">{data.clientNom}</span>
      </p>
      <p className="facture-bold facture-ligne">
        Facture hébergements N°{data.numero}
      </p>

      <p className="facture-bold facture-ligne">
        Les arrivées se font tous les jours entre{" "}
        <span className="facture-rouge">13h30</span> et{" "}
        <span className="facture-rouge">20h00</span>
      </p>
      <p className="facture-bold facture-ligne">
        Les départs se font tous les jours au plus tard à{" "}
        <span className="facture-rouge">12h00</span>
      </p>

      {/* Les sections suivantes (tableau, totaux, pied de page) arrivent aux prochaines étapes */}
    </div>
  );
}