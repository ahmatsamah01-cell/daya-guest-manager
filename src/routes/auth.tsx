import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/Brand";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function connexion(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error("Connexion impossible : " + error.message);
    else navigate({ to: "/dashboard" });
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-zinc-950 overflow-hidden font-sans">
      
      {/* Halo de fond principal */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(63,63,70,0.1)_0%,_rgba(0,0,0,0)_100%)]" />

      {/* --- CŒUR DE LA CARTE --- */}
      <div className="relative z-10 w-full max-w-sm">
        
        {/* Glow puissant derrière la carte pour détacher la bordure */}
        <div className="absolute -inset-4 bg-red-600/10 blur-[80px] rounded-[3rem] z-0" />

        {/* Logo */}
        <div className="relative z-10 mb-10 flex justify-center">
          <div className="p-6 bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-3xl shadow-2xl">
            <BrandLogo className="h-20" />
          </div>
        </div>

        {/* Carte de Connexion */}
        <div className="relative z-10 p-8 bg-zinc-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.3)]">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Accès Manager</h2>
            <p className="text-zinc-400 text-sm mt-1">Authentification sécurisée</p>
          </div>

          <form onSubmit={connexion} className="space-y-5">
            <div className="relative group">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
              <Input 
                type="email" 
                placeholder="Adresse e-mail" 
                required 
                className="pl-10 bg-black/50 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-red-500 focus:ring-red-500/20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
              <Input 
                type={showPassword ? "text" : "password"} 
                placeholder="Mot de passe" 
                required 
                className="pl-10 pr-10 bg-black/50 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-red-500 focus:ring-red-500/20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-zinc-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold h-12 rounded-xl transition-all shadow-[0_4px_15px_rgba(220,38,38,0.3)] active:scale-[0.98]"
            >
              {loading ? "Authentification..." : "SE CONNECTER"}
            </Button>
          </form>

          <div className="mt-6 flex justify-center items-center text-xs">
            <button className="text-zinc-500 hover:text-white transition-colors">Mot de passe oublié ?</button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
      `}</style>
    </div>
  );
}
