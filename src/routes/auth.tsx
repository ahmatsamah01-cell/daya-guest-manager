import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react"; // Import des icônes
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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

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
      
      {/* Halo Rouge Amélioré */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-red-900/10 blur-[120px] rounded-full animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-zinc-900 blur-[100px] rounded-full" />

      {/* Curseur Suiveur */}
      <div className="fixed z-50 pointer-events-none w-6 h-6 rounded-full bg-red-500/10 blur-md transition-all duration-100" style={{ left: mousePos.x - 12, top: mousePos.y - 12 }} />

      {/* Badge Système */}
      <div className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1 bg-zinc-900/80 border border-white/10 rounded-full text-[10px] uppercase tracking-widest text-emerald-500">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        Système Opérationnel
      </div>

      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        
        {/* Logo */}
        <div className="mb-10 flex justify-center">
          <div className="p-6 bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-3xl shadow-2xl">
            <BrandLogo className="h-20" />
          </div>
        </div>

        {/* Carte de Connexion */}
        <div className="p-8 bg-zinc-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.5)]">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Accès Manager</h2>
            <p className="text-zinc-400 text-sm mt-1">Identifiez-vous pour accéder au tableau de bord</p>
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

          <div className="mt-6 flex justify-between items-center text-xs">
            <button className="text-zinc-500 hover:text-white transition-colors">Mot de passe oublié ?</button>
            <ShieldCheck className="text-zinc-700" size={16} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-slow { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
        
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
      `}</style>
    </div>
  );
}
