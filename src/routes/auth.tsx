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
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-50 overflow-hidden font-sans">
      
      {/* Halo lumineux en arrière-plan */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-red-100/50 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-50/50 blur-[100px] rounded-full" />

      {/* Badge Système (Restauré) */}
      <div className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur border border-slate-200 rounded-full text-[10px] uppercase tracking-widest text-emerald-600 shadow-sm">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        Système Opérationnel
      </div>

      <div className="relative z-10 w-full max-w-sm px-4">
        
        {/* Logo */}
        <div className="mb-10 flex justify-center">
          <div className="p-6 bg-white/50 backdrop-blur-md border border-white/50 rounded-3xl shadow-xl">
            <BrandLogo className="h-20" />
          </div>
        </div>

        {/* Carte de Connexion Interactive */}
        <div className="group relative p-8 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl transition-all duration-500 hover:border-red-200 hover:shadow-[0_25px_50px_-12px_rgba(220,38,38,0.15)] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.05)]">
          
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Accès Manager</h2>
            <p className="text-slate-500 text-sm mt-1">Authentification sécurisée</p>
          </div>

          <form onSubmit={connexion} className="space-y-5">
            <div className="relative group">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400 group-focus-within:text-red-500 transition-colors" />
              <Input 
                type="email" 
                placeholder="Adresse e-mail" 
                required 
                className="pl-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:ring-red-500/20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400 group-focus-within:text-red-500 transition-colors" />
              <Input 
                type={showPassword ? "text" : "password"} 
                placeholder="Mot de passe" 
                required 
                className="pl-10 pr-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:ring-red-500/20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-red-600 text-white font-bold h-12 rounded-xl transition-all shadow-lg active:scale-[0.98]"
            >
              {loading ? "Authentification..." : "SE CONNECTER"}
            </Button>
          </form>

          <div className="mt-6 flex justify-center items-center text-xs text-slate-400 gap-2">
            <ShieldCheck size={14} />
            <span>Chiffrement AES-256 actif</span>
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
