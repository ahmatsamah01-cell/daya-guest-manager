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
      { name: "description", content: "Accès sécurisé à la gestion hôtelière." },
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
    if (error) { toast.error("Connexion impossible : " + error.message); return; }
    navigate({ to: "/dashboard" });
  }

  async function inscription(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password: motDePasse,
      options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { nom_complet: nomComplet } },
    });
    setLoading(false);
    if (error) { toast.error("Inscription impossible : " + error.message); return; }
    toast.success("Compte créé.");
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { toast.error("Connexion Google impossible."); return; }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-sidebar px-4 py-10 font-sans">
      
      {/* Arrière-plan lumineux */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-600/10 blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/5 blur-[140px]" />
      </div>

      {/* Logo Flottant Moderne */}
      <div className="relative z-10 mb-8 animate-float">
        <div className="rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-5 shadow-2xl">
          <BrandLogo className="max-h-24 sm:max-h-28" />
        </div>
      </div>

      {/* Carte principale */}
      <Card className="relative z-10 w-full max-w-md bg-sidebar border-none shadow-[0_0_40px_rgba(0,0,0,0.4),_inset_0_0_0_1px_rgba(255,255,255,0.05)] rounded-3xl">
        <CardHeader className="text-center pt-8">
          <CardTitle className="text-2xl font-black text-black dark:text-white uppercase tracking-tight">Accès au logiciel</CardTitle>
          <CardDescription className="text-muted-foreground italic">
            Réservé au personnel de l'établissement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="connexion">
            <TabsList className="mb-6 grid w-full grid-cols-2 bg-black/20 p-1 rounded-xl">
              <TabsTrigger value="connexion" className="rounded-lg">Connexion</TabsTrigger>
              <TabsTrigger value="inscription" className="rounded-lg">S'inscrire</TabsTrigger>
            </TabsList>

            <TabsContent value="connexion">
              <form onSubmit={connexion} className="space-y-4">
                <Input type="email" placeholder="Adresse e-mail" required value={email} onChange={(e) => setEmail(e.target.value)} className="bg-black/20 border-white/5" />
                <Input type="password" placeholder="Mot de passe" required value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} className="bg-black/20 border-white/5" />
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Se connecter</Button>
              </form>
            </TabsContent>

            <TabsContent value="inscription">
              <form onSubmit={inscription} className="space-y-4">
                <Input placeholder="Nom complet" required value={nomComplet} onChange={(e) => setNomComplet(e.target.value)} className="bg-black/20 border-white/5" />
                <Input type="email" placeholder="Adresse e-mail" required value={email} onChange={(e) => setEmail(e.target.value)} className="bg-black/20 border-white/5" />
                <Input type="password" placeholder="Mot de passe" required minLength={6} value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} className="bg-black/20 border-white/5" />
                <Button type="submit" className="w-full">Créer le compte</Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-white/10" /> ou <span className="h-px flex-1 bg-white/10" />
          </div>
          <Button variant="outline" className="w-full bg-white/5 border-white/10" onClick={google}>Continuer avec Google</Button>
        </CardContent>
      </Card>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
