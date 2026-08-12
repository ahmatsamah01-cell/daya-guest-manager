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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useEtablissement, useMonRole } from "@/hooks/use-hotel";

export const Route = createFileRoute("/_authenticated/chambres")({
  head: () => ({
    meta: [
      { title: "Chambres — LE DAYA Hotel Manager" },
      {
        name: "description",
        content: "Gérez les chambres de LE DAYA Guest House : type, tarif par nuit, capacité et statut.",
      },
      { property: "og:title", content: "Chambres — LE DAYA Hotel Manager" },
      { property: "og:description", content: "Inventaire et tarifs des chambres." },
    ],
  }),
  component: ChambresPage,
});

type Form = {
  id?: string;
  nom: string;
  type: string;
  prix_nuit: string;
  capacite: string;
  statut: string;
  description: string;
};

const vide: Form = {
  nom: "",
  type: "Standard",
  prix_nuit: "25000",
  capacite: "2",
  statut: "libre",
  description: "",
};

function ChambresPage() {
  const qc = useQueryClient();
  const { data: etab } = useEtablissement();
  const { data: role } = useMonRole();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(vide);

  const { data: chambres } = useQuery({
    queryKey: ["chambres"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chambres").select("*").order("nom");
      if (error) throw error;
      return data;
    },
  });

  const enregistrer = useMutation({
    mutationFn: async (f: Form) => {
      const payload = {
        etablissement_id: etab!.id,
        nom: f.nom,
        type: f.type,
        prix_nuit: Number(f.prix_nuit),
        capacite: Number(f.capacite),
        statut: f.statut,
        description: f.description || null,
      };
      const { error } = f.id
        ? await supabase.from("chambres").update(payload).eq("id", f.id)
        : await supabase.from("chambres").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chambres"] });
      setOpen(false);
      setForm(vide);
      toast.success("Chambre enregistrée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const supprimer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chambres").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chambres"] });
      toast.success("Chambre supprimée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Chambres"
        description="Inventaire, tarifs et disponibilité"
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
                <Plus className="size-4" /> Nouvelle chambre
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{form.id ? "Modifier la chambre" : "Nouvelle chambre"}</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  enregistrer.mutate(form);
                }}
              >
                <div className="space-y-2">
                  <Label>Nom / numéro</Label>
                  <Input
                    required
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Input
                      required
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prix / nuit (FCFA)</Label>
                    <Input
                      type="number"
                      min="0"
                      required
                      value={form.prix_nuit}
                      onChange={(e) => setForm({ ...form, prix_nuit: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Capacité</Label>
                    <Input
                      type="number"
                      min="1"
                      value={form.capacite}
                      onChange={(e) => setForm({ ...form, capacite: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Statut</Label>
                    <Select
                      value={form.statut}
                      onValueChange={(v) => setForm({ ...form, statut: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="libre">Libre</SelectItem>
                        <SelectItem value="occupee">Occupée</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={enregistrer.isPending || !etab}>
                    Enregistrer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chambre</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Prix / nuit</TableHead>
                <TableHead>Capacité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(chambres ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nom}</TableCell>
                  <TableCell>{c.type}</TableCell>
                  <TableCell>{formatFCFA(c.prix_nuit)}</TableCell>
                  <TableCell>{c.capacite}</TableCell>
                  <TableCell>
                    <Badge variant={c.statut === "libre" ? "secondary" : "outline"}>
                      {c.statut}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setForm({
                          id: c.id,
                          nom: c.nom,
                          type: c.type,
                          prix_nuit: String(c.prix_nuit),
                          capacite: String(c.capacite),
                          statut: c.statut,
                          description: c.description ?? "",
                        });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    {role?.estAdmin ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => supprimer.mutate(c.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
