import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useRef } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  BedDouble,
  Users2,
  LayoutGrid,
  List,
  Camera,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/AppLayout";
import { formatFCFA } from "@/lib/format";
import { useEtablissement, useMonRole } from "@/hooks/use-hotel";

export const Route = createFileRoute("/_authenticated/chambres")({
  head: () => ({
    meta: [
      { title: "Chambres — LE DAYA Hotel Manager" },
      {
        name: "description",
        content:
          "Gérez les chambres de LE DAYA Guest House : type, tarif par nuit, capacité et statut.",
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
  const [calendrierChambre, setCalendrierChambre] = useState<{
    id: string;
    nom: string;
  } | null>(null);
  const [moisAffiche, setMoisAffiche] = useState(() => new Date());

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
      const { data: publicUrlData } = supabase.storage
        .from("chambres")
        .getPublicUrl(chemin);
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
      const { data, error } = await supabase
        .from("chambres")
        .select("*")
        .order("nom");
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

  function statutChambre(chambreId: string): {
    cle: string;
    label: string;
    badge: string;
  } {
    const aujourd_hui = new Date().toISOString().slice(0, 10);
    const occupee = (reservations ?? []).some(
      (r) =>
        r.chambre_id === chambreId &&
        (r.statut === "en_cours" ||
          (r.date_arrivee <= aujourd_hui && r.date_depart > aujourd_hui))
    );
    if (occupee) {
      return {
        cle: "occupee",
        label: "Occupée",
        badge:
          "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border border-red-200/30",
      };
    }
    const reservee = (reservations ?? []).some(
      (r) => r.chambre_id === chambreId && r.statut === "reservee"
    );
    if (reservee) {
      return {
        cle: "reservee",
        label: "Réservée",
        badge:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200/30",
      };
    }
    return {
      cle: "libre",
      label: "Disponible",
      badge:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200/30",
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
    <div className="space-y-6">
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
              <Button className="bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 rounded-2xl px-5 py-2.5">
                <Plus className="size-4 mr-2" /> Nouvelle chambre
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-3xl shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                  {form.id ? "Modifier la chambre" : "Nouvelle chambre"}
                </DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  enregistrer.mutate(form);
                }}
              >
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Photo</Label>
                  <div className="flex items-center gap-3">
                    <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border border-slate-200/50 dark:border-slate-600/50">
                      {form.photo_url ? (
                        <img
                          src={form.photo_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <BedDouble className="size-8 text-slate-400 dark:text-slate-500" />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
                    >
                      <Camera className="size-3.5 mr-1.5" />
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
                  <Label className="text-slate-700 dark:text-slate-300">Nom / numéro</Label>
                  <Input
                    required
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Type</Label>
                    <Input
                      required
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Prix / nuit (FCFA)</Label>
                    <Input
                      type="number"
                      min="0"
                      required
                      value={form.prix_nuit}
                      onChange={(e) => setForm({ ...form, prix_nuit: e.target.value })}
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Capacité</Label>
                    <Input
                      type="number"
                      min="1"
                      value={form.capacite}
                      onChange={(e) => setForm({ ...form, capacite: e.target.value })}
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Statut</Label>
                    <Select
                      value={form.statut}
                      onValueChange={(v) => setForm({ ...form, statut: v })}
                    >
                      <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm">
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
                  <Label className="text-slate-700 dark:text-slate-300">Description</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="rounded-xl border-slate-200 dark:border-slate-600/50 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={enregistrer.isPending || !etab}
                    className="bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 rounded-2xl px-6"
                  >
                    Enregistrer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-500" /> Disponible
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-500" /> Réservée
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-red-500" /> Occupée
          </span>
        </div>
        <div className="flex rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-1 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <Button
            variant={vue === "grille" ? "default" : "ghost"}
            size="sm"
            onClick={() => setVue("grille")}
            className={vue === "grille" ? "bg-gradient-to-br from-red-500 to-rose-600 text-white rounded-xl" : "rounded-xl"}
          >
            <LayoutGrid className="size-4" />
          </Button>
          <Button
            variant={vue === "tableau" ? "default" : "ghost"}
            size="sm"
            onClick={() => setVue("tableau")}
            className={vue === "tableau" ? "bg-gradient-to-br from-red-500 to-rose-600 text-white rounded-xl" : "rounded-xl"}
          >
            <List className="size-4" />
          </Button>
        </div>
      </div>

      {vue === "grille" ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(chambres ?? []).map((c) => {
            const statutStyle = statutChambre(c.id);

            return (
              <Card
                key={c.id}
                className="group overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-3xl shadow-lg"
              >
                <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
                  {c.photo_url ? (
                    <img
                      src={c.photo_url}
                      alt={c.nom}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BedDouble className="size-12 text-slate-400 dark:text-slate-500" />
                    </div>
                  )}
                  <span
                    className={`absolute right-3 top-3 rounded-full px-3 py-1 text-[10px] font-semibold ${statutStyle.badge}`}
                  >
                    {statutStyle.label}
                  </span>
                </div>
                <CardContent className="space-y-2.5 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-lg font-bold text-slate-900 dark:text-white">
                        {c.nom}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{c.type}</p>
                    </div>
                    <p className="font-display text-sm font-bold text-red-500">
                      {formatFCFA(c.prix_nuit)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Users2 className="size-4" />
                    {c.capacite} pers.
                  </div>
                  {c.description ? (
                    <p className="line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                      {c.description}
                    </p>
                  ) : null}
                  <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
                      onClick={() => {
                        setMoisAffiche(new Date());
                        setCalendrierChambre({ id: c.id, nom: c.nom });
                      }}
                    >
                      <CalendarDays className="size-3.5 mr-1.5" /> Calendrier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
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
                      <Pencil className="size-3.5" />
                    </Button>
                    {role?.estAdmin ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-slate-200 dark:border-slate-600/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
                        onClick={() => supprimer.mutate(c.id)}
                      >
                        <Trash2 className="size-3.5 text-red-500" />
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {(chambres ?? []).length === 0 ? (
            <p className="col-span-full py-16 text-center text-sm text-slate-400 dark:text-slate-500">
              Aucune chambre enregistrée.
            </p>
          ) : null}
        </div>
      ) : (
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-100 dark:border-slate-700/50">
                  <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                    Chambre
                  </TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                    Type
                  </TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                    Prix / nuit
                  </TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                    Capacité
                  </TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300 font-semibold">
                    Statut
                  </TableHead>
                  <TableHead className="text-right text-slate-600 dark:text-slate-300 font-semibold">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(chambres ?? []).map((c) => (
                  <TableRow
                    key={c.id}
                    className="border-b border-slate-100/50 dark:border-slate-700/30 hover:bg-slate-50/50 dark:hover:bg-slate-700/20"
                  >
                    <TableCell className="font-medium text-slate-900 dark:text-white">
                      {c.nom}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300">
                      {c.type}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300">
                      {formatFCFA(c.prix_nuit)}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300">
                      {c.capacite}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statutChambre(c.id).badge}`}
                      >
                        {statutChambre(c.id).label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
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
                          className="rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => supprimer.mutate(c.id)}
                        >
                          <Trash2 className="size-4 text-red-500" />
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

      <Dialog
        open={!!calendrierChambre}
        onOpenChange={(o) => !o && setCalendrierChambre(null)}
      >
        <DialogContent className="max-w-md bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Calendrier — {calendrierChambre?.nom}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
              onClick={() =>
                setMoisAffiche(
                  new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() - 1, 1)
                )
              }
            >
              <ChevronLeft className="size-4" />
            </Button>
            <p className="font-medium text-slate-900 dark:text-white capitalize">
              {moisAffiche.toLocaleDateString("fr-FR", {
                month: "long",
                year: "numeric",
              })}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
              onClick={() =>
                setMoisAffiche(
                  new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() + 1, 1)
                )
              }
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-400 dark:text-slate-500">
            {["L", "M", "M", "J", "V", "S", "D"].map((j, i) => (
              <span key={i}>{j}</span>
            ))}
          </div>

          {(() => {
            const premierJour = new Date(
              moisAffiche.getFullYear(),
              moisAffiche.getMonth(),
              1
            );
            const dernierJour = new Date(
              moisAffiche.getFullYear(),
              moisAffiche.getMonth() + 1,
              0
            );
            const decalage = (premierJour.getDay() + 6) % 7;
            const cases: (Date | null)[] = [
              ...Array(decalage).fill(null),
              ...Array.from(
                { length: dernierJour.getDate() },
                (_, i) =>
                  new Date(
                    moisAffiche.getFullYear(),
                    moisAffiche.getMonth(),
                    i + 1
                  )
              ),
            ];

            return (
              <div className="grid grid-cols-7 gap-1">
                {cases.map((date, i) => {
                  if (!date) return <div key={i} />;
                  const dateStr = date.toISOString().slice(0, 10);
                  const occupe = (reservations ?? []).some(
                    (r) =>
                      r.chambre_id === calendrierChambre?.id &&
                      dateStr >= r.date_arrivee &&
                      dateStr < r.date_depart
                  );
                  return (
                    <div
                      key={i}
                      className={`flex aspect-square items-center justify-center rounded-xl text-xs font-medium transition-colors ${
                        occupe
                          ? "bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/25"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      }`}
                    >
                      {date.getDate()}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          <div className="flex justify-center gap-6 pt-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-emerald-500" /> Disponible
            </span>
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-red-500" /> Occupée
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}