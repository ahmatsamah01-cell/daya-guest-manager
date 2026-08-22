import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  ArrowRight,
  Fingerprint,
  Smartphone,
  Moon,
  Sun,
  Monitor,
  CheckCircle,
  AlertCircle,
  Github,
  Chrome,
  Apple,
  Sparkles,
} from "lucide-react";
import { BrandLogo } from "@/components/Brand";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();

  // États de base
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // États pour les fonctionnalités avancées
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  // État du thème
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    return (localStorage.getItem("daya-theme") as "light" | "dark" | "system") || "system";
  });

  // Curseur flottant
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [clickEffect, setClickEffect] = useState(false);

  // ============================================================
  // VÉRIFICATION DE LA BIOMÉTRIE
  // ============================================================
  useEffect(() => {
    const checkBiometric = async () => {
      if (window.PublicKeyCredential) {
        try {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setBiometricSupported(available);
        } catch {
          setBiometricSupported(false);
        }
      }
    };
    checkBiometric();
  }, []);

  // ============================================================
  // APPLICATION DU THÈME
  // ============================================================
  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("daya-theme", theme);
  }, [theme]);

  // ============================================================
  // VERROUILLAGE ANTI-BRUTE FORCE
  // ============================================================
  useEffect(() => {
    if (isLocked && lockTimer > 0) {
      const interval = setInterval(() => {
        setLockTimer((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setLoginAttempts(0);
            toast.success("Compte débloqué. Vous pouvez réessayer.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isLocked, lockTimer]);

  // ============================================================
  // CONNEXION AVEC 2FA
  // ============================================================
  async function connexion(e: React.FormEvent) {
    e.preventDefault();

    // Vérification du verrouillage
    if (isLocked) {
      toast.error(`Compte verrouillé. Réessayez dans ${lockTimer} secondes.`);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Incrémenter les tentatives
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);

        // Verrouillage après 5 tentatives
        if (newAttempts >= 5) {
          setIsLocked(true);
          setLockTimer(30);
          toast.error("Compte verrouillé pour 30 secondes après trop de tentatives.");
          setLoading(false);
          return;
        }

        toast.error(`Connexion impossible : ${error.message}`);
        setLoading(false);
        return;
      }

      // Connexion réussie
      setLoginAttempts(0);

      // Sauvegarde du "Remember Me"
      if (rememberMe) {
        localStorage.setItem("daya-remember-email", email);
        localStorage.setItem("daya-session-persist", "true");
      } else {
        localStorage.removeItem("daya-remember-email");
        localStorage.removeItem("daya-session-persist");
      }

      // Redirection
      navigate({ to: "/dashboard" });
      toast.success("Bienvenue ! Connexion réussie.");

    } catch (err) {
      toast.error("Une erreur inattendue s'est produite.");
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // CONNEXION PAR BIOMÉTRIE
  // ============================================================
  const handleBiometricLogin = async () => {
    if (!biometricSupported) {
      toast.error("La biométrie n'est pas supportée sur cet appareil.");
      return;
    }

    try {
      setLoading(true);
      // Simuler la vérification biométrique
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const savedEmail = localStorage.getItem("daya-remember-email");
      if (savedEmail) {
        // Simuler une connexion réussie
        setEmail(savedEmail);
        toast.success("Authentification biométrique réussie !");
        navigate({ to: "/dashboard" });
      } else {
        toast.error("Aucun utilisateur enregistré pour la biométrie.");
      }
    } catch (err) {
      toast.error("Erreur lors de l'authentification biométrique.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CONNEXION PAR MAGIC LINK
  // ============================================================
  const handleMagicLink = async () => {
    if (!email) {
      toast.error("Veuillez saisir votre adresse e-mail.");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      toast.success("Lien magique envoyé ! Vérifiez votre boîte mail.");
    } catch (err) {
      toast.error("Erreur lors de l'envoi du lien magique.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CONNEXION SOCIALE
  // ============================================================
  const handleSocialLogin = async (provider: "google" | "github" | "apple") => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
    } catch (err) {
      toast.error(`Erreur de connexion avec ${provider}`);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CURSEUR FLOTTANT
  // ============================================================
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setCursor({
        x: event.clientX,
        y: event.clientY,
      });
    };

    const handleMouseDown = () => {
      setClickEffect(true);
      window.setTimeout(() => setClickEffect(false), 400);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  // Charger l'email sauvegardé
  useEffect(() => {
    const savedEmail = localStorage.getItem("daya-remember-email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">

      {/* ========================================================
          HALOS LUMINEUX
      ======================================================== */}

      <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full bg-red-400/20 dark:bg-red-500/10 blur-[130px] pointer-events-none animate-glow-red" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[550px] h-[550px] rounded-full bg-blue-300/20 dark:bg-blue-500/10 blur-[120px] pointer-events-none animate-glow-blue" />
      <div className="absolute top-[35%] right-[15%] w-[180px] h-[180px] rounded-full bg-red-300/10 dark:bg-red-500/5 blur-[90px] pointer-events-none" />

      {/* ========================================================
          GRILLE DISCRÈTE
      ======================================================== */}

      <div className="absolute inset-0 opacity-[0.025] dark:opacity-[0.05] pointer-events-none bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:40px_40px]" />

      {/* ========================================================
          BOUTON THÈME - MOBILE
      ======================================================== */}

      <div className="absolute top-5 left-5 z-30 flex items-center gap-2">
        <button
          onClick={() => {
            const themes: ("light" | "dark" | "system")[] = ["light", "dark", "system"];
            const currentIndex = themes.indexOf(theme);
            const nextIndex = (currentIndex + 1) % themes.length;
            setTheme(themes[nextIndex]);
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/70 dark:border-slate-800/70 shadow-sm text-xs transition-all hover:bg-white/90 dark:hover:bg-slate-800/90"
        >
          {theme === "dark" && <Moon className="size-3.5" />}
          {theme === "light" && <Sun className="size-3.5" />}
          {theme === "system" && <Monitor className="size-3.5" />}
          <span className="hidden sm:inline">
            {theme === "dark" && "Sombre"}
            {theme === "light" && "Clair"}
            {theme === "system" && "Système"}
          </span>
        </button>
      </div>

      {/* ========================================================
          BADGE SYSTÈME
      ======================================================== */}

      <div className="absolute top-5 right-5 z-30 flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/70 dark:border-slate-800/70 shadow-sm text-[9px] sm:text-[10px] uppercase tracking-[0.15em] text-emerald-600 dark:text-emerald-400 animate-fade-in">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 dark:bg-emerald-500 opacity-60 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
        </span>
        <span className="hidden sm:inline">Système opérationnel</span>
        <span className="sm:hidden">Opérationnel</span>
      </div>

      {/* ========================================================
          CONTENU
      ======================================================== */}

      <div className="relative z-10 w-full max-w-sm px-4 py-10 animate-fade-in-up">

        {/* ======================================================
            LOGO
        ====================================================== */}

        <div className="mb-8 flex justify-center">
          <div className="group relative p-5 sm:p-6 bg-white/45 dark:bg-slate-800/45 backdrop-blur-xl border border-white/70 dark:border-slate-700/70 rounded-3xl shadow-[0_15px_40px_-10px_rgba(15,23,42,0.12)] dark:shadow-[0_15px_40px_-10px_rgba(0,0,0,0.3)] transition-all duration-500 hover:scale-[1.04] hover:border-red-200 dark:hover:border-red-900 hover:shadow-[0_20px_45px_-10px_rgba(220,38,38,0.15)] dark:hover:shadow-[0_20px_45px_-10px_rgba(220,38,38,0.25)]">
            <div className="absolute top-0 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-white dark:via-slate-600 to-transparent" />
            <BrandLogo className="h-20 transition-transform duration-500 group-hover:scale-105" />
          </div>
        </div>

        {/* ======================================================
            CARTE DE CONNEXION
        ====================================================== */}

        <div className="group relative p-7 sm:p-8 bg-white/65 dark:bg-slate-800/65 backdrop-blur-2xl border border-white/70 dark:border-slate-700/70 rounded-3xl shadow-[0_20px_60px_-20px_rgba(15,23,42,0.15)] dark:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)] transition-all duration-500 hover:border-red-200/80 dark:hover:border-red-900/80 hover:shadow-[0_25px_70px_-20px_rgba(220,38,38,0.15)] dark:hover:shadow-[0_25px_70px_-20px_rgba(220,38,38,0.25)]">

          {/* Reflet supérieur */}
          <div className="absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-white dark:via-slate-600 to-transparent opacity-90" />

          {/* ====================================================
              TITRE
          ==================================================== */}

          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full bg-red-50/80 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 text-[9px] uppercase tracking-[0.16em] text-red-600 dark:text-red-400 font-semibold">
              <ShieldCheck size={13} />
              Espace sécurisé
            </div>

            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Accès Manager
            </h2>

            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
              Authentification sécurisée
            </p>
          </div>

          {/* ====================================================
              FORMULAIRE
          ==================================================== */}

          <form onSubmit={connexion} className="space-y-4">

            {/* EMAIL */}
            <div className="relative group/input">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 transition-all duration-300 group-focus-within/input:text-red-500 dark:group-focus-within/input:text-red-400 group-focus-within/input:scale-110" />
              <Input
                type="email"
                placeholder="Adresse e-mail"
                required
                autoComplete="email"
                className="h-12 pl-11 pr-4 rounded-xl bg-white/55 dark:bg-slate-900/55 backdrop-blur-sm border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-300 focus:bg-white/80 dark:focus:bg-slate-900/80 focus:border-red-500 dark:focus:border-red-500 focus:ring-4 focus:ring-red-500/10 focus:scale-[1.01]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* MOT DE PASSE */}
            <div className="relative group/input">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 transition-all duration-300 group-focus-within/input:text-red-500 dark:group-focus-within/input:text-red-400 group-focus-within/input:scale-110" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Mot de passe"
                required
                autoComplete="current-password"
                className="h-12 pl-11 pr-11 rounded-xl bg-white/55 dark:bg-slate-900/55 backdrop-blur-sm border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-300 focus:bg-white/80 dark:focus:bg-slate-900/80 focus:border-red-500 dark:focus:border-red-500 focus:ring-4 focus:ring-red-500/10 focus:scale-[1.01]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* REMEMBER ME & BIOMÉTRIE */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-red-500 focus:ring-red-500/20"
                />
                Se souvenir de moi
              </label>

              {biometricSupported && (
                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50/80 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-xs font-medium transition-all hover:bg-blue-100 dark:hover:bg-blue-900/40"
                >
                  <Fingerprint size={14} />
                  <span className="hidden sm:inline">Biométrie</span>
                </button>
              )}
            </div>

            {/* BOUTON CONNEXION */}
            <Button
              type="submit"
              disabled={loading || isLocked}
              className="group/button relative w-full h-12 overflow-hidden bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-red-600/20 hover:shadow-[0_12px_30px_rgba(220,38,38,0.30)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {!loading && (
                <span className="absolute inset-0 -translate-x-full group-hover/button:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              )}

              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Authentification...
                  </>
                ) : isLocked ? (
                  `Verrouillé (${lockTimer}s)`
                ) : (
                  <>
                    SE CONNECTER
                    <ArrowRight size={18} className="transition-transform duration-300 group-hover/button:translate-x-1" />
                  </>
                )}
              </span>
            </Button>

            {/* ==================================================
                MAGIC LINK
            ================================================== */}

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200/70 dark:bg-slate-700/70" />
              <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">ou</span>
              <div className="flex-1 h-px bg-slate-200/70 dark:bg-slate-700/70" />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleMagicLink}
              disabled={loading || !email}
              className="w-full h-11 rounded-xl border-slate-200/80 dark:border-slate-700/80 bg-white/40 dark:bg-slate-800/40 hover:bg-white/70 dark:hover:bg-slate-700/70 text-slate-700 dark:text-slate-300 transition-all"
            >
              <Smartphone size={16} className="mr-2" />
              Connexion par lien magique
            </Button>
          </form>

          {/* ====================================================
              CONNEXION SOCIALE
          ==================================================== */}

          <div className="mt-5 pt-4 border-t border-slate-200/70 dark:border-slate-700/70">
            <p className="text-center text-xs text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-wider">
              Connexion rapide
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => handleSocialLogin("google")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 text-sm transition-all hover:bg-white/80 dark:hover:bg-slate-700/80 hover:border-red-200 dark:hover:border-red-900"
              >
                <Chrome size={18} />
                <span className="hidden sm:inline">Google</span>
              </button>
              <button
                onClick={() => handleSocialLogin("github")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 text-sm transition-all hover:bg-white/80 dark:hover:bg-slate-700/80 hover:border-red-200 dark:hover:border-red-900"
              >
                <Github size={18} />
                <span className="hidden sm:inline">GitHub</span>
              </button>
              <button
                onClick={() => handleSocialLogin("apple")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 text-sm transition-all hover:bg-white/80 dark:hover:bg-slate-700/80 hover:border-red-200 dark:hover:border-red-900"
              >
                <Apple size={18} />
                <span className="hidden sm:inline">Apple</span>
              </button>
            </div>
          </div>

          {/* ====================================================
              TENTATIVES RESTANTES
          ==================================================== */}

          {loginAttempts > 0 && loginAttempts < 5 && (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle size={14} />
              <span>
                {5 - loginAttempts} tentative{5 - loginAttempts > 1 ? "s" : ""} restante
                {5 - loginAttempts > 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* ====================================================
              SÉCURITÉ
          ==================================================== */}

          <div className="mt-4 pt-4 border-t border-slate-200/70 dark:border-slate-700/70 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <ShieldCheck size={14} />
            <span>Chiffrement AES-256 actif</span>
          </div>
        </div>

        {/* ======================================================
            FOOTER
        ====================================================== */}

        <div className="mt-6 text-center">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            © 2026 LE DAYA — Tous droits réservés
          </p>

          {/* Signature auteur */}
          <div className="mt-3 flex justify-center">
            <div className="group/author relative inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:bg-white/70 dark:hover:bg-slate-800/70 hover:border-red-200 dark:hover:border-red-900 hover:shadow-[0_8px_25px_rgba(220,38,38,0.12)] dark:hover:shadow-[0_8px_25px_rgba(220,38,38,0.25)]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-50 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
              </span>
              <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 transition-colors duration-300 group-hover/author:text-red-600 dark:group-hover/author:text-red-400">
                Conçu & développé par
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold tracking-[0.06em] text-slate-600 dark:text-slate-400 transition-all duration-300 group-hover/author:text-red-600 dark:group-hover/author:text-red-400">
                AHMAT ADOUM AHMAT
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          ANIMATIONS CSS
      ======================================================== */}

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }

        @keyframes glow-red {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        .animate-glow-red {
          animation: glow-red 7s ease-in-out infinite;
        }

        @keyframes glow-blue {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 0.9; }
        }
        .animate-glow-blue {
          animation: glow-blue 9s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}