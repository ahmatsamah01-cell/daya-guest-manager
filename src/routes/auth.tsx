import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — LE DAYA Hotel Manager" },
      {
        name: "description",
        content:
          "Connectez-vous à LE DAYA Hotel Manager pour gérer les chambres, réservations, caisse et facturation de LE DAYA Guest House à Port-Gentil.",
      },
      { property: "og:title", content: "Connexion — LE DAYA Hotel Manager" },
      {
        property: "og:description",
        content: "Accès sécurisé à la gestion hôtelière de LE DAYA Guest House, Port-Gentil.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [nomComplet, setNomComplet] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function connexion(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
    setLoading(false);
    if (error) {
      toast.error("Connexion impossible : " + error.message);
      return;
    }
    navigate({ to: "/dashboard" });
  }

  async function inscription(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password: motDePasse,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { nom_complet: nomComplet },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Inscription impossible : " + error.message);
      return;
    }
    toast.success("Compte créé. Vous pouvez vous connecter.");
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Connexion Google impossible.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-semibold text-sidebar-primary">LE DAYA</h1>
          <p className="text-xs tracking-[0.35em] text-sidebar-foreground/70 uppercase">
            Hotel Manager
          </p>
          <p className="mt-3 text-sm text-sidebar-foreground/70">
            Guest House — Port-Gentil, Gabon
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Accès au logiciel</CardTitle>
            <CardDescription>Réservé au personnel de l'établissement.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="connexion">
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="connexion">Connexion</TabsTrigger>
                <TabsTrigger value="inscription">Créer un compte</TabsTrigger>
              </TabsList>

              <TabsContent value="connexion">
                <form onSubmit={connexion} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Adresse e-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mdp">Mot de passe</Label>
                    <Input
                      id="mdp"
                      type="password"
                      required
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    Se connecter
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="inscription">
                <form onSubmit={inscription} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom complet</Label>
                    <Input
                      id="nom"
                      required
                      value={nomComplet}
                      onChange={(e) => setNomComplet(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email2">Adresse e-mail</Label>
                    <Input
                      id="email2"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mdp2">Mot de passe</Label>
                    <Input
                      id="mdp2"
                      type="password"
                      required
                      minLength={6}
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    Créer le compte
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Le premier compte créé devient automatiquement administrateur.
                  </p>
                </form>
              </TabsContent>
            </Tabs>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" className="w-full" onClick={google}>
              Continuer avec Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
