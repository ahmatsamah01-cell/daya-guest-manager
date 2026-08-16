import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FactureDocument, type FactureDocumentData } from "@/components/FactureDocument";
import { LOGO_URL } from "@/components/Brand";

export const Route = createFileRoute("/__facture-preview")({
  head: () => ({
    meta: [
      { title: "Aperçu facture — LE DAYA Hotel Manager" },
      { name: "description", content: "Aperçu de mise en page de la facture LE DAYA Guest House." },
      { property: "og:title", content: "Aperçu facture — LE DAYA Hotel Manager" },
      { property: "og:description", content: "Aperçu de mise en page de la facture." },
    ],
  }),
  component: Preview,
});

function Preview() {
  const [data, setData] = useState<FactureDocumentData | null>(null);
  useEffect(() => {
    (window as unknown as { __setFacture: (d: FactureDocumentData) => void }).__setFacture = (d) =>
      setData({ ...d, logoUrl: LOGO_URL });
  }, []);
  return data ? <FactureDocument data={data} /> : <p>En attente de données…</p>;
}
