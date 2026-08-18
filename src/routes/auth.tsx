import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandLogo } from "@/components/Brand";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Suivi du curseur
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // ... (Garde tes fonctions connexion, inscription, google intactes)
  async function connexion(e: React.FormEvent) { e.preventDefault(); setLoading(true); const { error } = await supabase.auth.signInWithPassword({ email, password }); setLoading(false); if (error) toast.error("Erreur : " + error.message); else navigate({ to: "/dashboard" }); }
  async function google() { await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin }); }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-zinc-950 overflow-hidden font-sans text-white">
      
      {/* Halo rouge unique qui bouge lentement */}
      <div 
        className="absolute z-0 w-[600px] h-[600px] bg-red-900/20 blur-[150px] rounded-full animate-halo-drift" 
      />

      {/* Curseur lumineux */}
      <div 
        className="fixed z-50 pointer-events-none w-8 h-8 rounded-full bg-red-500/10 blur-xl transition-all duration-75"
        style={{ left: mousePos.x - 16, top: mousePos.y - 16 }}
      />

      {/* Carte principale avec animation Fade+Slide */}
      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="p-4 bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl">
            <BrandLogo className="h-20" />
          </div>
        </div>

        {/* Formulaire */}
        <div className="p-8 bg-black/40 backdrop-blur-md border border-white/5 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <h2 className="text-xl font-bold mb-6 text-center tracking-tight text-white">Accès au logiciel</h2>

          <form onSubmit={connexion} className="space-y-4">
            <Input 
              type="email" 
              placeholder="Adresse e-mail" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-900/50 border-white/5 focus:border-red-500/50 transition-colors"
            />
            <Input 
              type="password" 
              placeholder="Mot de passe" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-zinc-900/50 border-white/5 focus:border-red-500/50 transition-colors"
            />
            
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold transition-all hover:shadow-[0_0_15px_rgba(220,38,38,0.5)] active:scale-95"
            >
              {loading ? "Chargement..." : "Se connecter"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={google} className="text-xs text-zinc-500 hover:text-white transition-colors">
              Ou continuer avec Google
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes halo-drift {
          0%, 100% { transform: translate(-10%, -10%); }
          50% { transform: translate(10%, 10%); }
        }
        .animate-halo-drift { animation: halo-drift 15s ease-in-out infinite; }
        
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
      `}</style>
    </div>
  );
}
