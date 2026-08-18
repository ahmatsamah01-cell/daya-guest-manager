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
import { BrandLogo, SLOGAN } from "@/components/Brand";

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
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-sidebar px-4 py-10 font-sans">
      
      {/* --- ARRIÈRE-PLAN LUMINEUX DYNAMIQUE --- */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-600/20 blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/10 blur-[140px] animate-pulse delay-1000" />
      </div>

      {/* --- CONTENEUR PRINCIPAL FLOTTANT --- */}
      <div className="relative z-10 w-full max-w-md animate-float">
        
        {/* En-tête avec Logo et Slogan */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 w-fit rounded-2xl bg-white/10 backdrop-blur-md p-4 shadow-xl border border-white/10">
            <BrandLogo className="max-h-28 sm:max-h-32" />
          </div>
          <p className="text-xs tracking-[0.35em] text-sidebar-foreground/80 uppercase font-semibold">
            Hotel Manager
          </p>
          <p className="mt-2 text-sm text-sidebar-foreground/90 italic">{SLOGAN}</p>
          <p className="mt-1 text-xs text-sidebar-foreground/70">
            Guest House — Port-Gentil, Gabon
          </p>
        </div>

        {/* Carte Glassmorphism Transparente */}
        <Card className="bg-card/50 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Accès au logiciel</CardTitle>
            <CardDescription className="text-muted-foreground">
              Réservé au personnel de l'établissement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="connexion">
              <TabsList className="mb-6 grid w-full grid-cols-2 bg-black/20 p-1 rounded-xl">
                <TabsTrigger value="connexion" className="rounded-lg">Connexion</TabsTrigger>
                <TabsTrigger value="inscription" className="rounded-lg">Créer un compte</TabsTrigger>
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
                      className="bg-background/40 border-white/10 focus:ring-2 focus:ring-primary/30"
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
                      className="bg-background/40 border-white/10 focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <Button type="submit" className="w-full shadow-lg shadow-primary/20" disabled={loading}>
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
                      className="bg-background/40 border-white/10"
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
                      className="bg-background/40 border-white/10"
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
                      className="bg-background/40 border-white/10"
                    />
                  </div>
                  <Button type="submit" className="w-full shadow-lg shadow-primary/20" disabled={loading}>
                    Créer le compte
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Le premier compte créé devient automatiquement administrateur.
                  </p>
                </form>
              </TabsContent>
            </Tabs>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border/60" /> ou <span className="h-px flex-1 bg-border/60" />
            </div>
            <Button variant="outline" className="w-full bg-background/30 hover:bg-background/50 border-white/10" onClick={google}>
              Continuer avec Google
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* --- ANIMATION CSS FLOTTANTE --- */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
