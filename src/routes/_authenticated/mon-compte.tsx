import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/AppLayout";
import { useMonRole } from "@/hooks/use-hotel";
import { LogOut, Camera, KeyRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mon-compte")({
  head: () => ({
    meta: [{ title: "Mon compte — LE DAYA Hotel Manager" }],
  }),
  component: MonComptePage,
});

function MonComptePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: role } = useMonRole();
  const fileRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [motDePasse, setMotDePasse] = useState("");
  const [motDePasseConfirm, setMotDePasseConfirm] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAvatarUrl((data.user?.user_metadata?.avatar_url as string) ?? null);
    });
  });

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Utilisateur introuvable");

      const chemin = `${uid}/avatar.${file.name.split(".").pop()}`;
      const { error: eUpload } = await supabase.storage
        .from("avatars")
        .upload(chemin, file, { upsert: true });
      if (eUpload) throw eUpload;

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(chemin);
      const url = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      const { error: eUpdate } = await supabase.auth.updateUser({
        data: { avatar_url: url },
      });
      if (eUpdate) throw eUpdate;

      setAvatarUrl(url);
      qc.invalidateQueries();
      toast.success("Photo de profil mise à jour.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'upload.");
    } finally {
      setUploading(false);
    }
  }

  async function handleChangerMotDePasse(e: React.FormEvent) {
    e.preventDefault();
    if (motDePasse.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (motDePasse !== motDePasseConfirm) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: motDePasse });
      if (error) throw error;
      toast.success("Mot de passe mis à jour.");
      setMotDePasse("");
      setMotDePasseConfirm("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleDeconnexion() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const initiale = (role?.email?.[0] ?? "U").toUpperCase();

  return (
    <div>
      <PageHeader title="Mon compte" description="Gérez vos informations personnelles" />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Photo de profil</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Photo de profil"
                  className="size-28 rounded-full border object-cover"
                />
              ) : (
                <div className="flex size-28 items-center justify-center rounded-full bg-primary text-3xl font-semibold text-primary-foreground">
                  {initiale}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 flex size-9 items-center justify-center rounded-full border bg-card shadow-sm hover:bg-accent"
              >
                <Camera className="size-4" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {uploading ? "Envoi en cours…" : "Cliquez sur l'icône pour changer votre photo"}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Adresse e-mail</Label>
              <p className="text-sm font-medium">{role?.email ?? "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Rôle</Label>
              <p className="text-sm font-medium uppercase">
                {role?.roles?.join(", ") || "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center gap-2">
            <KeyRound className="size-4" />
            <CardTitle className="text-base">Changer le mot de passe</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleChangerMotDePasse}>
              <div className="space-y-2">
                <Label>Nouveau mot de passe</Label>
                <Input
                  type="password"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Confirmer le mot de passe</Label>
                <Input
                  type="password"
                  value={motDePasseConfirm}
                  onChange={(e) => setMotDePasseConfirm(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" disabled={changingPassword}>
                Mettre à jour le mot de passe
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Session</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" className="w-full gap-2" onClick={handleDeconnexion}>
              <LogOut className="size-4" /> Se déconnecter
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}