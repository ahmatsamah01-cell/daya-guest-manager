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
  lignesDayUse?: LigneHebergement[];
  totalDayUse?: number;
  remise?: { label: string; montant: number };
  avance?: number;
  totalGeneral: number;
  avance?: number;
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

const UNITES_F = [
  "", "UN", "DEUX", "TROIS", "QUATRE", "CINQ", "SIX", "SEPT", "HUIT", "NEUF",
  "DIX", "ONZE", "DOUZE", "TREIZE", "QUATORZE", "QUINZE", "SEIZE", "DIX-SEPT", "DIX-HUIT", "DIX-NEUF",
];
const DIZAINES_F = [
  "", "", "VINGT", "TRENTE", "QUARANTE", "CINQUANTE", "SOIXANTE", "SOIXANTE-DIX", "QUATRE-VINGT", "QUATRE-VINGT-DIX",
];

function nombreEnLettresFacture(n: number): string {
  if (n === 0) return "ZÉRO FRANC CFA.";

  function trois(n: number): string {
    const c = Math.floor(n / 100);
    const r = n % 100;
    let s = "";
    if (c > 0) s += (c > 1 ? UNITES_F[c] + " " : "") + "CENT" + (c > 1 && r === 0 ? "S" : "") + " ";
    if (r > 0) {
      if (r < 20) {
        s += UNITES_F[r];
      } else {
        const d = Math.floor(r / 10);
        const u = r % 10;
        if (d === 7 || d === 9) {
          s += DIZAINES_F[d - 1] + "-" + UNITES_F[10 + u];
        } else {
          s += DIZAINES_F[d] + (u > 0 ? (u === 1 && d !== 8 ? "-ET-UN" : "-" + UNITES_F[u]) : d === 8 ? "S" : "");
        }
      }
    }
    return s.trim();
  }

  const tranches = [
    { valeur: 1_000_000_000, mot: "MILLIARD" },
    { valeur: 1_000_000, mot: "MILLION" },
    { valeur: 1_000, mot: "MILLE" },
  ];

  let reste = Math.round(n);
  let resultat = "";

  for (const { valeur, mot } of tranches) {
    const q = Math.floor(reste / valeur);
    if (q > 0) {
      const prefixe = valeur === 1000 && q === 1 ? "" : trois(q) + " ";
      resultat += prefixe + mot + (q > 1 && mot !== "MILLE" ? "S" : "") + " ";
      reste %= valeur;
    }
  }

  if (reste > 0) {
    resultat += trois(reste);
  }

  return resultat.trim() + " FRANCS CFA.";
}

function formatXAF(n: number): string {
  return Math.round(n).toLocaleString("fr-FR").replace(/\s/g, ".") + " XAF";
}

export function FactureDocument({ data }: { data: FactureDocumentData }) {
  return (
    <div className="facture-a4">
      <div className="facture-corps">
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

     <table className="facture-tableau">
        <colgroup>
          <col style={{ width: "34%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "17%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "18%" }} />
        </colgroup>
        <thead>
          <tr className="facture-entete-bandeau">
            <th className="facture-th-gauche">Périodes du {data.periodeLabel}</th>
            <th>Nuitées</th>
            <th>N° Chambres</th>
            <th>PRIX. U</th>
            <th>PRIX. T</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={5} className="facture-bold facture-section-titre">
              Hébergements
            </td>
          </tr>
          {data.lignesHebergement.map((l, i) => (
            <tr key={i}>
              <td>{l.periode}</td>
              <td className="facture-centre">{l.nuitees}</td>
              <td className="facture-centre">{l.chambre}</td>
              <td className="facture-droite">{formatXAF(l.prixUnitaire)}</td>
              <td className="facture-droite">{formatXAF(l.prixTotal)}</td>
            </tr>
          ))}
          {data.reliquat && data.reliquat > 0 ? (
            <tr>
              <td>Reliquat</td>
              <td></td>
              <td></td>
              <td></td>
              <td className="facture-droite">{formatXAF(data.reliquat)}</td>
            </tr>
          ) : null}
          <tr>
            <td className="facture-bold">{data.clientNom}</td>
            <td></td>
            <td></td>
            <td className="facture-total-label">TOTAL 1</td>
            <td className="facture-total-valeur">{formatXAF(data.totalHebergement)}</td>
          </tr>
{data.lignesDayUse && data.lignesDayUse.length > 0 ? (
            <>
              <tr>
                <td colSpan={5}>&nbsp;</td>
              </tr>
              {data.lignesDayUse.map((l, i) => (
                <tr key={`dayuse-${i}`}>
                  <td>DAY USE</td>
                  <td className="facture-centre">{l.periode}</td>
                  <td className="facture-centre">{l.chambre}</td>
                  <td className="facture-droite">{formatXAF(l.prixUnitaire)}</td>
                  <td className="facture-droite">{formatXAF(l.prixTotal)}</td>
                </tr>
              ))}
              <tr>
                <td></td>
                <td></td>
                <td></td>
                <td className="facture-total-label">TOTAL 2</td>
                <td className="facture-total-valeur">{formatXAF(data.totalDayUse ?? 0)}</td>
              </tr>
              <tr>
                <td className="facture-bold">{data.clientNom}</td>
                <td></td>
                <td></td>
                <td className="facture-total-label">TOTAL 1 + 2</td>
                <td className="facture-total-valeur">
                  {formatXAF(data.totalHebergement + (data.totalDayUse ?? 0))}
                </td>
              </tr>
            </>
          ) : null}
          {data.buanderie && data.buanderie.total > 0 ? (
            <>
              <tr>
                <td colSpan={3}>Buanderie</td>
                <td colSpan={2} className="facture-droite">
                  {data.buanderie.detail}
                </td>
              </tr>
              <tr>
                <td className="facture-bold">{data.clientNom}</td>
                <td></td>
                <td></td>
                <td className="facture-total-label">TOTAL</td>
                <td className="facture-total-valeur">{formatXAF(data.buanderie.total)}</td>
              </tr>
            </>
          ) : null}

          {data.remise && data.remise.montant > 0 ? (
            <tr>
              <td colSpan={4}>{data.remise.label}</td>
              <td className="facture-droite">- {formatXAF(data.remise.montant)}</td>
            </tr>
          ) : null}

          <tr className="facture-total-general">
            <td colSpan={4} className="facture-bold facture-rouge">
              Total
            </td>
            <td className="facture-bold facture-rouge facture-droite">
              {formatXAF(data.totalGeneral)}
            </td>
          </tr>

          {data.avance && data.avance > 0 ? (
            <>
              <tr>
                <td colSpan={4}>Avance</td>
                <td className="facture-droite">{formatXAF(data.avance)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="facture-bold facture-rouge">
                  Reste à payer
                </td>
                <td className="facture-bold facture-rouge facture-droite">
                  {formatXAF(data.totalGeneral - data.avance)}
                </td>
              </tr>
            </>
          ) : null}
        </tbody>
      </table>

      <p className="facture-ligne facture-espace-haut">
        Arrêter la présente facture à la somme de{" "}
        <span className="facture-bold">{nombreEnLettresFacture(data.totalGeneral)}</span>
      </p>

      {data.chequeBeneficiaire ? (
        <>
          <p className="facture-bold facture-ligne">
            EN CAS DE PAIEMENT PAR CHEQUE, VEUILLEZ LE LIBELLER AU NOM DE :
          </p>
          <p className="facture-bold facture-bleu-cheque facture-ligne">
            {data.chequeBeneficiaire}
          </p>
        </>
      ) : null}
      </div>

      <p className="facture-date">

      <p className="facture-date">
        Fait à {data.ville}, le {data.dateEmission}
      </p>

      <div className="facture-logo-bas">
        <img src={data.logoUrl} alt="Le Daya Guest House" />
      </div>

      <div className="facture-pied">
        <p className="facture-pied-titre">
          <span className="facture-tirets">------------------------------------------------</span>{" "}
          <span className="facture-rouge">{data.etablissement.nom} by LDJ</span>{" "}
          <span className="facture-tirets">---------------------------------------------</span>
        </p>
        <p>Hébergements – Appartements hôtel – Restaurant - bar</p>
        <p>
          BP 780 {data.ville} / GABON - Tel : {data.etablissement.telephone} Email :{" "}
          {data.etablissement.email}
        </p>
        <p>
          RCCM : {data.etablissement.rccm} – N.I.F : {data.etablissement.nif}
        </p>
        <p>
          Identité Bancaire {data.etablissement.banque} - compte N° {data.etablissement.compte}{" "}
          Clé {data.etablissement.cle}
        </p>
      </div>
    </div>
  );
}