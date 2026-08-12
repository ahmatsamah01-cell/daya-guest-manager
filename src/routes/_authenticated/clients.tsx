import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/AppLayout";
import { useEtablissement, useMonRole } from "@/hooks/use-hotel";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({
    meta: [
      { title: "Clients — LE DAYA Hotel Manager" },
      {
        name: "description",
        content: "Fichier clients de LE DAYA Guest House : coordonnées, pièce d'identité et nationalité.",
      },
      { property: "og:title", content: "Clients — LE DAYA Hotel Manager" },
      { property: "og:description", content: "Base de données des clients de l'établissement." },
    ],
  }),
  component: ClientsPage,
});

type Form = {
  id?: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  type_piece: string;
  numero_piece: string;
  nationalite: string;
  adresse: string;
};

const vide: Form = {
  nom: "",
  prenom: "",
  telephone: "",
  email: "",
  type_piece: "",
  numero_piece: "",
  nationalite: "",
  adresse: "",
};

function ClientsPage() {
  const qc = useQueryClient();
  const { data: etab } = useEtablissement();
  const { data: role } = useMonRole();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(vide);
  const [recherche, setRecherche] = useState("");

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const enregistrer = useMutation({
    mutationFn: async (f: Form) => {
      const payload = {
        etablissement_id: etab!.id,
        nom: f.nom,
        prenom: f.prenom || null,
        telephone: f.telephone || null,
        email: f.email || null,
        type_piece: f.type_piece || null,
        numero_piece: f.numero_piece || null,
        nationalite: f.nationalite || null,
        adresse: f.adresse || null,
      };
      const { error } = f.id
        ? await supabase.from("clients").update(payload).eq("id", f.id)
        : await supabase.from("clients").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
      setForm(vide);
      toast.success("Client enregistré.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const supprimer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client supprimé.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtres = (clients ?? []).filter((c) =>
    `${c.nom} ${c.prenom ?? ""} ${c.telephone ?? ""}`.toLowerCase().includes(recherche.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Fichier clients de l'établissement"
        action={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setForm(vide);
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> Nouveau client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{form.id ? "Modifier le client" : "Nouveau client"}</DialogTitle>
              </DialogHeader>
              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  enregistrer.mutate(form);
                }}
              >
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    required
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input
                    value={form.prenom}
                    onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    value={form.telephone}
                    onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type de pièce</Label>
                  <Input
                    placeholder="CNI, passeport…"
                    value={form.type_piece}
                    onChange={(e) => setForm({ ...form, type_piece: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>N° de pièce</Label>
                  <Input
                    value={form.numero_piece}
                    onChange={(e) => setForm({ ...form, numero_piece: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nationalité</Label>
                  <Input
                    value={form.nationalite}
                    onChange={(e) => setForm({ ...form, nationalite: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Adresse</Label>
                  <Input
                    value={form.adresse}
                    onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                  />
                </div>
                <DialogFooter className="sm:col-span-2">
                  <Button type="submit" disabled={enregistrer.isPending || !etab}>
                    Enregistrer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Rechercher un client…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Pièce</TableHead>
                <TableHead>Nationalité</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtres.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {c.prenom} {c.nom}
                  </TableCell>
                  <TableCell>{c.telephone ?? "—"}</TableCell>
                  <TableCell>
                    {c.type_piece ? `${c.type_piece} ${c.numero_piece ?? ""}` : "—"}
                  </TableCell>
                  <TableCell>{c.nationalite ?? "—"}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setForm({
                          id: c.id,
                          nom: c.nom,
                          prenom: c.prenom ?? "",
                          telephone: c.telephone ?? "",
                          email: c.email ?? "",
                          type_piece: c.type_piece ?? "",
                          numero_piece: c.numero_piece ?? "",
                          nationalite: c.nationalite ?? "",
                          adresse: c.adresse ?? "",
                        });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    {role?.estAdmin ? (
                      <Button variant="ghost" size="icon" onClick={() => supprimer.mutate(c.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {filtres.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Aucun client enregistré.
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
