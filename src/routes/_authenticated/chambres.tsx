import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useRef } from "react";
import { Plus, Pencil, Trash2, BedDouble, Users2, LayoutGrid, List, Camera } from "lucide-react";
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
  photo_url: string;
};

const vide: Form = {
  nom: "",
  type: "Standard",
  prix_nuit: "25000",
  capacite: "2",
  statut: "libre",
  description: "",
  photo_url: "", 
};

function ChambresPage() {
  const qc = useQueryClient();
  const { data: etab } = useEtablissement();
  const { data: role } = useMonRole();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(vide);
  const [vue, setVue] = useState<"grille" | "tableau">("grille");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const chemin = `${Date.now()}-${file.name}`;
      const { error: eUpload } = await supabase.storage
        .from("chambres")
        .upload(chemin, file, { upsert: true });
      if (eUpload) throw eUpload;
      const { data: publicUrlData } = supabase.storage.from("chambres").getPublicUrl(chemin);
      setForm((f) => ({ ...f, photo_url: publicUrlData.publicUrl }));
      toast.success("Photo ajoutée.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'upload.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  const { data: chambres } = useQuery({
    queryKey: ["chambres"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chambres").select("*").order("nom");
      if (error) throw error;
      return data;
    },
  });

  const { data: reservations } = useQuery({
    queryKey: ["chambres-reservations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("chambre_id, statut, date_arrivee, date_depart")
        .neq("statut", "annulee");
      if (error) throw error;
      return data ?? [];
    },
  });

  function statutChambre(chambreId: string): { cle: string; label: string; badge: string } {
    const aujourd_hui = new Date().toISOString().slice(0, 10);
    const occupee = (reservations ?? []).some(
      (r) =>
        r.chambre_id === chambreId &&
        (r.statut === "en_cours" || (r.date_arrivee <= aujourd_hui && r.date_depart > aujourd_hui)),
    );
    if (occupee) {
      return {
        cle: "occupee",
        label: "Occupée",
        badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
      };
    }
    const reservee = (reservations ?? []).some(
      (r) => r.chambre_id === chambreId && r.statut === "reservee",
    );
    if (reservee) {
      return {
        cle: "reservee",
        label: "Réservée",
        badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
      };
    }
    return {
      cle: "libre",
      label: "Disponible",
      badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    };
  }

  const enregistrer = useMutation({
    mutationFn: async (f: Form) => {
     const payload = {
        etablissement_id: etab!.id,
        nom: f.nom,
        type: f.type,
        prix_nuit: Number(f.prix_nuit),
        capacite: Number(f.capacite),
        description: f.description || null,
        photo_url: f.photo_url || null, 
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
                  <Label>Photo</Label>
                  <div className="flex items-center gap-3">
                    <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-red-900 to-stone-900">
                      {form.photo_url ? (
                        <img src={form.photo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <BedDouble className="size-6 text-white/60" />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      <Camera className="size-3.5" />
                      {uploadingPhoto ? "Envoi…" : "Choisir une photo"}
                    </Button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </div>
                </div>

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

     <div className="mb-4 flex justify-end">
        <div className="flex rounded-lg border p-1">
          <Button
            variant={vue === "grille" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setVue("grille")}
          >
            <LayoutGrid className="size-4" />
          </Button>
          <Button
            variant={vue === "tableau" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setVue("tableau")}
          >
            <List className="size-4" />
          </Button>
        </div>
      </div>

      {vue === "grille" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(chambres ?? []).map((c) => {
            const statutStyle = statutChambre(c.id);

            return (
              <Card key={c.id} className="group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
                <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-red-900 via-red-800 to-stone-900">
                  {c.photo_url ? (
                    <img src={c.photo_url} alt={c.nom} className="h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BedDouble className="size-10 text-white/70" />
                    </div>
                  )}
                  <span
                    className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statutStyle.badge}`}
                  >
                    {statutStyle.label}
                  </span>
                </div>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display font-semibold">{c.nom}</p>
                      <p className="text-xs text-muted-foreground">{c.type}</p>
                    </div>
                    <p className="font-display text-sm font-bold text-primary">
                      {formatFCFA(c.prix_nuit)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users2 className="size-3.5" />
                    {c.capacite} pers.
                  </div>
                  {c.description ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
                  ) : null}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    onClick={() => {
                        setForm({
                          id: c.id,
                          nom: c.nom,
                          type: c.type,
                          prix_nuit: String(c.prix_nuit),
                          capacite: String(c.capacite),
                          statut: c.statut,
                          description: c.description ?? "",
                          photo_url: c.photo_url ?? "",
                        });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" /> Modifier
                    </Button>
                    {role?.estAdmin ? (
                      <Button variant="outline" size="sm" onClick={() => supprimer.mutate(c.id)}>
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {(chambres ?? []).length === 0 ? (
            <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
              Aucune chambre enregistrée.
            </p>
          ) : null}
        </div>
      ) : (
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
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statutChambre(c.id).badge}`}
                      >
                        {statutChambre(c.id).label}
                      </span>
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
                          photo_url: c.photo_url ?? "",
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
      )}
    </div>
  );
}