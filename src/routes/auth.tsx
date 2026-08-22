
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Chrome,
  Hotel,
  Users,
  BedDouble,
  Plus,
  Trash2,
} from "lucide-react";
import { BrandLogo } from "@/components/Brand";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

// ============================================================
// FONCTIONS D'AIDE - WEBAUTHN
// ============================================================

// Récupérer l'IP du client
async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return '0.0.0.0';
  }
}

// Journaliser une connexion
async function logConnexion(userId: string, email: string, ip: string) {
  try {
    await supabase
      .from("connexions_log")
      .insert({
        user_id: userId,
        email: email,
        ip_address: ip,
        user_agent: navigator.userAgent,
      });
  } catch (error) {
    console.error("Erreur de journalisation:", error);
  }
}

// ============================================================
// WEBAUTHN - FONCTIONS DE CONVERSION
// ============================================================

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function base64UrlToArrayBuffer(base64Url: string): ArrayBuffer {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  return base64ToArrayBuffer(base64 + padding);
}

// ============================================================
// WEBAUTHN - ENREGISTREMENT ET CONNEXION
// ============================================================

// Enregistrer une clé biométrique (WebAuthn)
async function registerBiometricKey(
  userId: string,
  email: string
): Promise<{ credentialId: string; publicKey: string; clientData: string } | null> {
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge: challenge,
      rp: {
        name: "LE DAYA Hotel Manager",
        id: window.location.hostname,
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: email,
        displayName: email,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "required",
      },
      timeout: 60000,
      attestation: "none",
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    }) as PublicKeyCredential;

    if (!credential) return null;

    const response = credential.response as AuthenticatorAttestationResponse;
    const clientDataJSON = arrayBufferToBase64(response.clientDataJSON);
    const attestationObject = arrayBufferToBase64(response.attestationObject);

    return {
      credentialId: credential.id,
      publicKey: attestationObject,
      clientData: clientDataJSON,
    };
  } catch (err) {
    console.error("WebAuthn registration error:", err);
    throw err;
  }
}

// Se connecter avec la biométrie (WebAuthn)
async function loginWithBiometricKey(
  credentialId: string
): Promise<boolean> {
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge: challenge,
      allowCredentials: [
        {
          id: base64UrlToArrayBuffer(credentialId),
          type: "public-key",
        },
      ],
      userVerification: "required",
      timeout: 60000,
      rpId: window.location.hostname,
    };

    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    }) as PublicKeyCredential;

    if (!assertion) return false;

    return true;
  } catch (err) {
    console.error("WebAuthn login error:", err);
    return false;
  }
}

function AuthPage() {
  const navigate = useNavigate();

  // États de base
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // États biométrie
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricRegistered, setBiometricRegistered] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  // États sécurité
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // État du thème
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    return (localStorage.getItem("daya-theme") as "light" | "dark" | "system") || "system";
  });

  // Vérifier si une clé biométrique est enregistrée
  useEffect(() => {
    const saved = localStorage.getItem("daya-biometric-credential");
    setBiometricRegistered(!!saved);
  }, []);

  // ============================================================
  // STATISTIQUES RÉELLES
  // ============================================================

  const { data: statsReels, refetch: refetchStats } = useQuery({
    queryKey: ["auth-stats"],
    queryFn: async () => {
      try {
        const { count: reservations, error: e1 } = await supabase
          .from("reservations")
          .select("*", { count: "exact", head: true });

        if (e1) console.error("Erreur réservations:", e1);

        const { count: chambres, error: e2 } = await supabase
          .from("chambres")
          .select("*", { count: "exact", head: true });

        if (e2) console.error("Erreur chambres:", e2);

        const aujourdhui = new Date().toISOString().split("T")[0];
        const { data: resasEnCours, error: e3 } = await supabase
          .from("reservations")
          .select("chambre_id, statut, date_arrivee, date_depart")
          .neq("statut", "annulee");

        if (e3) console.error("Erreur enCours:", e3);

        const chambresOccupees = new Set(
          (resasEnCours || [])
            .filter(
              (r) =>
                r.statut === "en_cours" ||
                (r.date_arrivee <= aujourdhui && r.date_depart > aujourdhui)
            )
            .map((r) => r.chambre_id)
        );

        const totalChambres = chambres || 1;
        const occupation = Math.round((chambresOccupees.size / totalChambres) * 100);

        return {
          reservations: reservations || 0,
          chambres: chambres || 0,
          occupation: isNaN(occupation) ? 0 : occupation,
        };
      } catch (error) {
        console.error("Erreur stats:", error);
        return { reservations: 0, chambres: 0, occupation: 0 };
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: true,
    retry: 1,
  });

  // ============================================================
  // DERNIÈRES CONNEXIONS
  // ============================================================

  const { data: dernieresConnexions } = useQuery({
    queryKey: ["auth-connexions"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("connexions_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);
        if (error) return [];
        return data || [];
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: true,
    retry: 1,
  });

  // ============================================================
  // VÉRIFICATION DE LA BIOMÉTRIE
  // ============================================================
  useEffect(() => {
    const checkBiometric = async () => {
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(navigator.userAgent);
      if (isMobile) {
        setBiometricSupported(false);
        return;
      }

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
  // CONNEXION PRINCIPALE
  // ============================================================
  async function connexion(e: React.FormEvent) {
    e.preventDefault();

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
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);

        if (newAttempts >= 5) {
          setIsLocked(true);
          setLockTimer(30);
          toast.error("Compte verrouillé pour 30 secondes.");
          setLoading(false);
          return;
        }

        toast.error("Connexion impossible : " + error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        const ip = await getClientIP();
        await logConnexion(data.user.id, email, ip);
      }

      setLoginAttempts(0);
      if (rememberMe) {
        localStorage.setItem("daya-remember-email", email);
      }

      refetchStats();
      navigate({ to: "/dashboard" });
      toast.success("Bienvenue ! Connexion réussie.");

    } catch (err) {
      toast.error("Une erreur inattendue s'est produite.");
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // BIOMÉTRIE - ENREGISTRER (WEBAUTHN RÉEL)
  // ============================================================
  const handleRegisterBiometric = async () => {
    if (!biometricSupported) {
      toast.error("La biométrie n'est pas supportée sur cet appareil.");
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast.error("Connectez-vous d'abord avec votre mot de passe.");
        return;
      }

      setBiometricLoading(true);

      const existing = await supabase
        .from("user_credentials")
        .select("*")
        .eq("user_id", user.user.id)
        .maybeSingle();

      if (existing.data) {
        toast.info("Vous avez déjà une clé biométrique enregistrée.");
        setBiometricLoading(false);
        return;
      }

      const result = await registerBiometricKey(user.user.id, user.user.email || "");

      if (!result) {
        throw new Error("Échec de la création de la clé biométrique.");
      }

      const { error } = await supabase
        .from("user_credentials")
        .insert({
          user_id: user.user.id,
          credential_id: result.credentialId,
          public_key: result.publicKey,
          client_data_json: result.clientData,
          device_name: navigator.userAgent.includes("Mac") ? "Mac" :
                        navigator.userAgent.includes("Windows") ? "Windows" :
                        navigator.userAgent.includes("Linux") ? "Linux" : "Ordinateur",
          type: "webauthn",
        });

      if (error) throw error;

      localStorage.setItem("daya-biometric-credential", result.credentialId);
      setBiometricRegistered(true);
      toast.success("🔐 Clé biométrique enregistrée avec succès !");

    } catch (err) {
      console.error("Erreur biométrique:", err);
      toast.error("Erreur : " + (err as Error).message);
    } finally {
      setBiometricLoading(false);
    }
  };

  // ============================================================
  // BIOMÉTRIE - CONNEXION (WEBAUTHN RÉEL)
  // ============================================================
  const handleBiometricLogin = async () => {
    if (!biometricSupported) {
      toast.error("La biométrie n'est pas supportée sur cet appareil.");
      return;
    }

    try {
      setBiometricLoading(true);

      const savedCredentialId = localStorage.getItem("daya-biometric-credential");
      const savedEmail = localStorage.getItem("daya-remember-email");

      if (!savedCredentialId || !savedEmail) {
        toast.error("Aucune clé biométrique enregistrée.");
        setBiometricLoading(false);
        return;
      }

      const { data: credential, error: credError } = await supabase
        .from("user_credentials")
        .select("*")
        .eq("credential_id", savedCredentialId)
        .single();

      if (credError || !credential) {
        toast.error("Clé biométrique introuvable.");
        localStorage.removeItem("daya-biometric-credential");
        setBiometricRegistered(false);
        setBiometricLoading(false);
        return;
      }

      const isAuthenticated = await loginWithBiometricKey(savedCredentialId);

      if (!isAuthenticated) {
        toast.error("Échec de l'authentification biométrique.");
        setBiometricLoading(false);
        return;
      }

      setEmail(savedEmail);
      toast.success("🔐 Authentification biométrique réussie !");

      await supabase
        .from("user_credentials")
        .update({ last_used: new Date().toISOString() })
        .eq("credential_id", savedCredentialId);

      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const ip = await getClientIP();
        await logConnexion(user.user.id, savedEmail, ip);
      }

      navigate({ to: "/dashboard" });

    } catch (err) {
      console.error("Erreur biométrique:", err);
      toast.error("Erreur : " + (err as Error).message);
    } finally {
      setBiometricLoading(false);
    }
  };

  // ============================================================
  // BIOMÉTRIE - SUPPRIMER
  // ============================================================
  const deleteBiometric = async () => {
    try {
      const savedCredentialId = localStorage.getItem("daya-biometric-credential");
      if (!savedCredentialId) {
        toast.error("Aucune clé biométrique trouvée.");
        return;
      }

      const { error } = await supabase
        .from("user_credentials")
        .delete()
        .eq("credential_id", savedCredentialId);

      if (error) throw error;

      localStorage.removeItem("daya-biometric-credential");
      setBiometricRegistered(false);
      toast.success("Clé biométrique supprimée.");

    } catch (err) {
      console.error("Erreur suppression:", err);
      toast.error("Erreur lors de la suppression.");
    }
  };

  // ============================================================
  // MAGIC LINK
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

      setMagicLinkSent(true);
      toast.success("Lien magique envoyé ! Vérifiez votre boîte mail.");
      setTimeout(() => setMagicLinkSent(false), 5000);
    } catch (err) {
      toast.error("Erreur lors de l'envoi du lien magique.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // GOOGLE LOGIN
  // ============================================================
  const handleSocialLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err) {
      toast.error("Erreur de connexion avec Google");
    } finally {
      setLoading(false);
    }
  };

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
    <div className="relative min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-hidden font-sans">

      {/* Fonds d'écran */}
      <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-red-500/15 dark:bg-red-500/10 blur-[140px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-amber-400/10 dark:bg-amber-400/5 blur-[130px] pointer-events-none animate-pulse-slower" />
      <div className="absolute top-[30%] right-[5%] w-[300px] h-[300px] rounded-full bg-blue-400/10 dark:bg-blue-400/5 blur-[100px] pointer-events-none" />

      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Bouton thème */}
      <div className="absolute top-5 left-5 z-30">
        <button
          onClick={() => {
            const themes: ("light" | "dark" | "system")[] = ["light", "dark", "system"];
            const currentIndex = themes.indexOf(theme);
            const nextIndex = (currentIndex + 1) % themes.length;
            setTheme(themes[nextIndex]);
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/70 dark:border-slate-800/70 shadow-sm text-xs text-slate-600 dark:text-slate-300 transition-all hover:bg-white/90 dark:hover:bg-slate-800/90"
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

      {/* Badge système */}
      <div className="absolute top-5 right-5 z-30 flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/70 dark:border-slate-800/70 shadow-sm text-[9px] sm:text-[10px] uppercase tracking-[0.15em] text-emerald-600 dark:text-emerald-400 animate-fade-in">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 dark:bg-emerald-500 opacity-60 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
        </span>
        <span className="hidden sm:inline">Système opérationnel</span>
        <span className="sm:hidden">Opérationnel</span>
      </div>

      {/* Contenu principal */}
      <div className="relative z-10 w-full max-w-6xl px-4 py-8 animate-fade-in-up">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

          {/* ====================================================
              COLONNE GAUCHE - FORMULAIRE
          ==================================================== */}

          <div className="w-full max-w-md mx-auto lg:mx-0">

            {/* Logo */}
            <div className="mb-8 flex justify-center lg:justify-start">
              <div className="relative w-full max-w-[280px] bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/70 dark:border-slate-700/70 rounded-3xl shadow-lg overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:border-red-200 dark:hover:border-red-900 hover:shadow-[0_20px_45px_-10px_rgba(220,38,38,0.15)]">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/60 dark:via-slate-600/60 to-transparent" />
                <BrandLogo className="w-full h-auto p-4 transition-transform duration-500 hover:scale-105" />
              </div>
            </div>

            {/* Carte de connexion */}
            <div className="relative p-7 sm:p-8 bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl border border-white/70 dark:border-slate-700/70 rounded-3xl shadow-[0_20px_60px_-20px_rgba(15,23,42,0.12)] dark:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.4)] transition-all duration-500 hover:border-red-200/80 dark:hover:border-red-900/80 hover:shadow-[0_25px_70px_-20px_rgba(220,38,38,0.12)]">

              <div className="absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-white/60 dark:via-slate-600/60 to-transparent" />

              <div className="flex items-center justify-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50/80 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 text-[9px] uppercase tracking-[0.16em] text-red-600 dark:text-red-400 font-semibold">
                  <ShieldCheck size={13} />
                  Espace sécurisé
                </div>
              </div>

              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Accès Manager</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Authentification sécurisée</p>
              </div>

              <form onSubmit={connexion} className="space-y-4">

                <div className="relative group/input">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 transition-all duration-300 group-focus-within/input:text-red-500 dark:group-focus-within/input:text-red-400" />
                  <Input
                    type="email"
                    placeholder="Adresse e-mail"
                    required
                    autoComplete="email"
                    className="h-11 pl-10 pr-4 rounded-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-300 focus:bg-white/90 dark:focus:bg-slate-900/90 focus:border-red-500 dark:focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="relative group/input">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 transition-all duration-300 group-focus-within/input:text-red-500 dark:group-focus-within/input:text-red-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Mot de passe"
                    required
                    autoComplete="current-password"
                    className="h-11 pl-10 pr-11 rounded-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-300 focus:bg-white/90 dark:focus:bg-slate-900/90 focus:border-red-500 dark:focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

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
                  <button
                    type="button"
                    onClick={() => setShowMagicLink(!showMagicLink)}
                    className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>

                {showMagicLink && (
                  <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/50">
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                      Recevez un lien de connexion par email
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleMagicLink}
                      disabled={loading || !email || magicLinkSent}
                      className="w-full h-9 text-xs rounded-xl border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      {magicLinkSent ? (
                        <><CheckCircle className="size-3.5 mr-1.5" /> Envoyé !</>
                      ) : (
                        <><Smartphone className="size-3.5 mr-1.5" /> Envoyer le lien magique</>
                      )}
                    </Button>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || isLocked}
                  className="group/button relative w-full h-11 overflow-hidden bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-red-500/25 hover:shadow-[0_12px_30px_rgba(220,38,38,0.30)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70"
                >
                  {!loading && (
                    <span className="absolute inset-0 -translate-x-full group-hover/button:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Authentification...</>
                    ) : isLocked ? (
                      `Verrouillé (${lockTimer}s)`
                    ) : (
                      <>Se connecter <ArrowRight size={16} className="transition-transform duration-300 group-hover/button:translate-x-1" /></>
                    )}
                  </span>
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200/60 dark:border-slate-700/60" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-white/70 dark:bg-slate-800/70 text-slate-400 dark:text-slate-500 uppercase tracking-wider">ou</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSocialLogin}
                  className="w-full rounded-xl border-slate-200/80 dark:border-slate-700/80 bg-white/40 dark:bg-slate-800/40 hover:bg-white/70 dark:hover:bg-slate-700/70 text-slate-700 dark:text-slate-300 text-sm h-11"
                >
                  <Chrome size={18} className="mr-2" />
                  Continuer avec Google
                </Button>

                {loginAttempts > 0 && loginAttempts < 5 && (
                  <div className="flex items-center justify-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                    <AlertCircle size={14} />
                    <span>{5 - loginAttempts} tentative{5 - loginAttempts > 1 ? "s" : ""} restante{5 - loginAttempts > 1 ? "s" : ""}</span>
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                  <ShieldCheck size={14} />
                  <span>Chiffrement AES-256</span>
                  <span className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
                  <span>SSL/TLS</span>
                </div>
              </form>
            </div>

            <div className="mt-6 text-center">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                © 2026 LE DAYA — Tous droits réservés
              </p>
            </div>
          </div>

          {/* ====================================================
              COLONNE DROITE - INFORMATIONS
          ==================================================== */}

          <div className="hidden lg:block space-y-6">

            <div className="relative p-8 bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl border border-white/60 dark:border-slate-700/60 rounded-3xl shadow-[0_20px_60px_-20px_rgba(15,23,42,0.10)]">
              <div className="absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-white/60 dark:via-slate-600/60 to-transparent" />

              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/25">
                  <Hotel className="size-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">LE DAYA</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Guest House • Port-Gentil</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Gérez votre établissement en toute sérénité. Accédez à toutes les fonctionnalités
                de gestion hôtelière : réservations, chambres, facturation et bien plus encore.
              </p>

              <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-200/50 dark:border-slate-700/50">
                <div className="text-center">
                  <p className="text-xs text-slate-400 dark:text-slate-500">Réservations</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {statsReels?.reservations || 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400 dark:text-slate-500">Chambres</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {statsReels?.chambres || 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400 dark:text-slate-500">Occupation</p>
                  <p className="text-lg font-bold text-emerald-500">
                    {statsReels?.occupation || 0}%
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 rounded-3xl">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Users className="size-4 text-red-500" />
                Dernières connexions
              </h4>
              <div className="space-y-2">
                {(dernieresConnexions || []).length > 0 ? (
                  dernieresConnexions?.map((log) => (
                    <div key={log.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                        {log.email}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {new Date(log.created_at).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-400 dark:text-slate-500 text-center py-2">
                    Aucune connexion récente
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/40 dark:border-slate-700/40 rounded-2xl">
              <div className="flex -space-x-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 border-2 border-white dark:border-slate-800">
                  <Monitor className="size-3.5" />
                </div>
                <div className="flex size-8 items-center justify-center rounded-full bg-purple-500/10 text-purple-500 border-2 border-white dark:border-slate-800">
                  <Smartphone className="size-3.5" />
                </div>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                2 appareils connectés
              </span>
              <button className="ml-auto text-xs text-red-500 dark:text-red-400 hover:text-red-600 transition-colors">
                Gérer
              </button>
            </div>

            {/* BIOMÉTRIE - DESKTOP UNIQUEMENT */}
            {biometricSupported && (
              <div className="space-y-2">
                <button
                  onClick={handleBiometricLogin}
                  disabled={!biometricRegistered || biometricLoading}
                  className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/50 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Fingerprint className="size-5" />
                  <span className="text-sm font-medium">
                    {biometricLoading ? "Vérification..." : biometricRegistered ? "Connexion par empreinte" : "Biométrie non enregistrée"}
                  </span>
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={handleRegisterBiometric}
                    disabled={biometricLoading}
                    className="flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border border-amber-200/50 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 transition-all hover:scale-[1.02] hover:shadow-lg text-sm disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <Plus className="size-4" />
                    <span>{biometricLoading ? "En cours..." : "Enregistrer"}</span>
                  </button>
                  {biometricRegistered && (
                    <button
                      onClick={deleteBiometric}
                      disabled={biometricLoading}
                      className="flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border border-red-200/50 dark:border-red-800/50 text-red-600 dark:text-red-400 transition-all hover:scale-[1.02] hover:shadow-lg text-sm disabled:opacity-50 disabled:hover:scale-100"
                    >
                      <Trash2 className="size-4" />
                      <span>Supprimer</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }

        @keyframes pulse-slow {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.6; }
          50% { transform: scale(1.1) rotate(5deg); opacity: 1; }
        }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }

        @keyframes pulse-slower {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.5; }
          50% { transform: scale(1.08) rotate(-5deg); opacity: 0.9; }
        }
        .animate-pulse-slower { animation: pulse-slower 10s ease-in-out infinite; }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }
      `}</style>
    </div>
  );
}