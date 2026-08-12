import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/AppLayout";
import { formatFCFA } from "@/lib/format";
import { useEtablissement, useParametres, useMonRole } from "@/hooks/use-hotel";

export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres — LE DAYA Hotel Manager" },
      {
        name: "description",
        content:
          "Configuration de LE DAYA Guest House : coordonnées, montant de la taxe de séjour et rôles utilisateurs.",
      },
      { property: "og:title", content: "Paramètres — LE DAYA Hotel Manager" },
      { property: "og:description", content: "Réglages administrateur de l'établissement." },
    ],
  }),
  component: ParametresPage,
});

const ROLES = [
  { value: "admin", label: "Administrateur" },
  { value: "reception", label: "Réception" },
  { value: "comptable", label: "Comptable" },
];

function ParametresPage() {
  const qc = useQueryClient();
  const { data: etab } = useEtablissement();
  const { data: params } = useParametres(etab?.id);
  const { data: monRole } = useMonRole();
  const estAdmin = monRole?.estAdmin ?? false;

  const [etabForm, setEtabForm] = useState({
    nom: "",
    ville: "",
    telephone: "",
    email: "",
  });
  const [taxe, setTaxe] = useState("");
  const [prefixe, setPrefixe] = useState("");

  useEffect(() => {
    if (etab) {
      setEtabForm({
        nom: etab.nom ?? "",
        ville: etab.ville ?? "",
        telephone: etab.telephone ?? "",
        email: etab.email ?? "",
      });
    }
  }, [etab]);

  useEffect(() => {
    if (params) {
      setTaxe(params["taxe_sejour_montant"] ?? "1000");
      setPrefixe(params["prefixe_facture"] ?? "FAC");
    }
  }, [params]);

  const { data: utilisateurs } = useQuery({
    queryKey: ["utilisateurs"],
    queryFn: async () => {
      const [profils, roles] = await Promise.all([
        supabase.from("profiles").select("*").order("nom_complet"),
        supabase.from("user_roles").select("*"),
      ]);
      if (profils.error) throw profils.error;
      if (roles.error) throw roles.error;
      return (profils.data ?? []).map((p) => ({
        ...p,
        role: roles.data?.find((r) => r.user_id === p.id)?.role ?? null,
      }));
    },
  });

  const enregistrerEtab = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("etablissements")
        .update({
          nom: etabForm.nom,
          ville: etabForm.ville || null,
          telephone: etabForm.telephone || null,
          email: etabForm.email || null,
        })
        .eq("id", etab!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["etablissement"] });
      toast.success("Établissement mis à jour.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enregistrerParams = useMutation({
    mutationFn: async () => {
      const entries = [
        { cle: "taxe_sejour_montant", valeur: taxe },
        { cle: "prefixe_facture", valeur: prefixe },
      ];
      for (const e of entries) {
        const { error } = await supabase
          .from("parametres")
          .upsert(
            { etablissement_id: etab!.id, cle: e.cle, valeur: e.valeur },
            { onConflict: "etablissement_id,cle" },
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parametres"] });
      toast.success("Paramètres enregistrés.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changerRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error: eDel } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (eDel) throw eDel;
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: role as "admin" | "reception" | "comptable" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["utilisateurs"] });
      toast.success("Rôle mis à jour.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Paramètres" description="Configuration de l'établissement et des accès" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Établissement</CardTitle>
            <CardDescription>Coordonnées affichées sur les documents</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                enregistrerEtab.mutate();
              }}
            >
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input
                  value={etabForm.nom}
                  disabled={!estAdmin}
                  onChange={(e) => setEtabForm({ ...etabForm, nom: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Input
                    value={etabForm.ville}
                    disabled={!estAdmin}
                    onChange={(e) => setEtabForm({ ...etabForm, ville: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    value={etabForm.telephone}
                    disabled={!estAdmin}
                    onChange={(e) => setEtabForm({ ...etabForm, telephone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={etabForm.email}
                  disabled={!estAdmin}
                  onChange={(e) => setEtabForm({ ...etabForm, email: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={!estAdmin || enregistrerEtab.isPending}>
                Enregistrer
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Facturation & taxe</CardTitle>
            <CardDescription>
              Taxe actuelle : {formatFCFA(Number(taxe || 0))} par nuitée et par chambre
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                enregistrerParams.mutate();
              }}
            >
              <div className="space-y-2">
                <Label>Montant de la taxe de séjour (FCFA / nuitée)</Label>
                <Input
                  type="number"
                  min="0"
                  value={taxe}
                  disabled={!estAdmin}
                  onChange={(e) => setTaxe(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Préfixe des numéros de facture</Label>
                <Input
                  value={prefixe}
                  disabled={!estAdmin}
                  onChange={(e) => setPrefixe(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={!estAdmin || enregistrerParams.isPending}>
                Enregistrer
              </Button>
              {!estAdmin ? (
                <p className="text-xs text-muted-foreground">
                  Seul un administrateur peut modifier ces paramètres.
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Utilisateurs & rôles</CardTitle>
          <CardDescription>Attribution des accès de l'équipe</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Rôle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(utilisateurs ?? []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nom_complet || "—"}</TableCell>
                  <TableCell>{u.telephone ?? "—"}</TableCell>
                  <TableCell>
                    {estAdmin ? (
                      <Select
                        value={u.role ?? "reception"}
                        onValueChange={(v) => changerRole.mutate({ userId: u.id, role: v })}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary">
                        {ROLES.find((r) => r.value === u.role)?.label ?? "Aucun"}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(utilisateurs ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    Aucun utilisateur.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
