import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
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

  // Curseur flottant
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [clickEffect, setClickEffect] = useState(false);

  // ============================================================
  // CONNEXION — LOGIQUE SUPABASE CONSERVÉE
  // ============================================================

  async function connexion(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      toast.error("Connexion impossible : " + error.message);
    } else {
      navigate({ to: "/dashboard" });
    }
  }

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

      window.setTimeout(() => {
        setClickEffect(false);
      }, 400);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-50 overflow-hidden font-sans">

      {/* ========================================================
          HALOS LUMINEUX
      ======================================================== */}

      {/* Halo rouge */}
      <div
        className="
          absolute
          top-[-15%]
          left-[-10%]
          w-[600px]
          h-[600px]
          rounded-full
          bg-red-400/20
          blur-[130px]
          pointer-events-none
          animate-glow-red
        "
      />

      {/* Halo bleu */}
      <div
        className="
          absolute
          bottom-[-15%]
          right-[-10%]
          w-[550px]
          h-[550px]
          rounded-full
          bg-blue-300/20
          blur-[120px]
          pointer-events-none
          animate-glow-blue
        "
      />

      {/* Halo secondaire */}
      <div
        className="
          absolute
          top-[35%]
          right-[15%]
          w-[180px]
          h-[180px]
          rounded-full
          bg-red-300/10
          blur-[90px]
          pointer-events-none
        "
      />

      {/* ========================================================
          GRILLE DISCRÈTE
      ======================================================== */}

      <div
        className="
          absolute
          inset-0
          opacity-[0.025]
          pointer-events-none
          bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)]
          bg-[size:40px_40px]
        "
      />

      {/* ========================================================
          BADGE SYSTÈME
      ======================================================== */}

      <div
        className="
          absolute
          top-5
          right-5
          sm:top-6
          sm:right-6
          z-30
          flex
          items-center
          gap-2
          px-3
          sm:px-4
          py-2
          rounded-full
          bg-white/70
          backdrop-blur-xl
          border
          border-white/70
          shadow-sm
          text-[9px]
          sm:text-[10px]
          uppercase
          tracking-[0.15em]
          text-emerald-600
          animate-fade-in
        "
      >
        <span className="relative flex h-2 w-2">
          <span
            className="
              absolute
              inline-flex
              h-full
              w-full
              rounded-full
              bg-emerald-400
              opacity-60
              animate-ping
            "
          />

          <span
            className="
              relative
              inline-flex
              h-2
              w-2
              rounded-full
              bg-emerald-500
            "
          />
        </span>

        <span className="hidden sm:inline">
          Système opérationnel
        </span>

        <span className="sm:hidden">
          Opérationnel
        </span>
      </div>

      {/* ========================================================
          CURSEUR FLOTTANT
      ======================================================== */}

      <div
        className="
          fixed
          z-50
          pointer-events-none
          hidden
          lg:block
          transition-transform
          duration-150
          ease-out
        "
        style={{
          transform: `translate3d(${cursor.x - 12}px, ${
            cursor.y - 12
          }px, 0)`,
        }}
      >
        <div
          className={`
            relative
            flex
            items-center
            justify-center
            w-6
            h-6
            rounded-full
            border
            border-red-500/40
            bg-red-500/5
            backdrop-blur-sm
            transition-all
            duration-300
            ${
              clickEffect
                ? "scale-[2.2] border-red-500/70 bg-red-500/10"
                : "scale-100"
            }
          `}
        >
          <div
            className={`
              w-1.5
              h-1.5
              rounded-full
              bg-red-500
              shadow-[0_0_12px_rgba(220,38,38,0.8)]
              transition-all
              duration-300
              ${clickEffect ? "scale-0" : "scale-100"}
            `}
          />

          {clickEffect && (
            <div
              className="
                absolute
                inset-0
                rounded-full
                border
                border-red-400/50
                animate-ping
              "
            />
          )}
        </div>
      </div>

      {/* ========================================================
          CONTENU
      ======================================================== */}

      <div
        className="
          relative
          z-10
          w-full
          max-w-sm
          px-4
          py-10
          animate-fade-in-up
        "
      >

        {/* ======================================================
            LOGO
        ====================================================== */}

        <div className="mb-8 flex justify-center">
          <div
            className="
              group
              relative
              p-5
              sm:p-6
              bg-white/45
              backdrop-blur-xl
              border
              border-white/70
              rounded-3xl
              shadow-[0_15px_40px_-10px_rgba(15,23,42,0.12)]
              transition-all
              duration-500
              hover:scale-[1.04]
              hover:border-red-200
              hover:shadow-[0_20px_45px_-10px_rgba(220,38,38,0.15)]
            "
          >
            <div
              className="
                absolute
                top-0
                left-[20%]
                right-[20%]
                h-px
                bg-gradient-to-r
                from-transparent
                via-white
                to-transparent
              "
            />

            <BrandLogo
              className="
                h-20
                transition-transform
                duration-500
                group-hover:scale-105
              "
            />
          </div>
        </div>

        {/* ======================================================
            CARTE DE CONNEXION
        ====================================================== */}

        <div
          className="
            group
            relative
            p-7
            sm:p-8
            bg-white/65
            backdrop-blur-2xl
            border
            border-white/70
            rounded-3xl
            shadow-[0_20px_60px_-20px_rgba(15,23,42,0.15)]
            transition-all
            duration-500
            hover:border-red-200/80
            hover:shadow-[0_25px_70px_-20px_rgba(220,38,38,0.15)]
          "
        >

          {/* Reflet supérieur */}
          <div
            className="
              absolute
              top-0
              left-[15%]
              right-[15%]
              h-px
              bg-gradient-to-r
              from-transparent
              via-white
              to-transparent
              opacity-90
            "
          />

          {/* ====================================================
              TITRE
          ==================================================== */}

          <div className="mb-8 text-center">

            <div
              className="
                inline-flex
                items-center
                gap-2
                px-3
                py-1.5
                mb-4
                rounded-full
                bg-red-50/80
                border
                border-red-100
                text-[9px]
                uppercase
                tracking-[0.16em]
                text-red-600
                font-semibold
              "
            >
              <ShieldCheck size={13} />
              Espace sécurisé
            </div>

            <h2
              className="
                text-2xl
                font-black
                text-slate-900
                uppercase
                tracking-tight
              "
            >
              Accès Manager
            </h2>

            <p className="text-slate-500 text-sm mt-2">
              Authentification sécurisée
            </p>
          </div>

          {/* ====================================================
              FORMULAIRE
          ==================================================== */}

          <form onSubmit={connexion} className="space-y-5">

            {/* EMAIL */}

            <div className="relative group/input">

              <Mail
                className="
                  absolute
                  left-3.5
                  top-1/2
                  -translate-y-1/2
                  w-5
                  h-5
                  text-slate-400
                  transition-all
                  duration-300
                  group-focus-within/input:text-red-500
                  group-focus-within/input:scale-110
                "
              />

              <Input
                type="email"
                placeholder="Adresse e-mail"
                required
                autoComplete="email"
                className="
                  h-12
                  pl-11
                  pr-4
                  rounded-xl
                  bg-white/55
                  backdrop-blur-sm
                  border-slate-200/80
                  text-slate-900
                  placeholder:text-slate-400
                  transition-all
                  duration-300
                  focus:bg-white/80
                  focus:border-red-500
                  focus:ring-4
                  focus:ring-red-500/10
                  focus:scale-[1.01]
                "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* MOT DE PASSE */}

            <div className="relative group/input">

              <Lock
                className="
                  absolute
                  left-3.5
                  top-1/2
                  -translate-y-1/2
                  w-5
                  h-5
                  text-slate-400
                  transition-all
                  duration-300
                  group-focus-within/input:text-red-500
                  group-focus-within/input:scale-110
                "
              />

              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Mot de passe"
                required
                autoComplete="current-password"
                className="
                  h-12
                  pl-11
                  pr-11
                  rounded-xl
                  bg-white/55
                  backdrop-blur-sm
                  border-slate-200/80
                  text-slate-900
                  placeholder:text-slate-400
                  transition-all
                  duration-300
                  focus:bg-white/80
                  focus:border-red-500
                  focus:ring-4
                  focus:ring-red-500/10
                  focus:scale-[1.01]
                "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
                onClick={() =>
                  setShowPassword(!showPassword)
                }
                className="
                  absolute
                  right-3
                  top-1/2
                  -translate-y-1/2
                  p-1.5
                  rounded-lg
                  text-slate-400
                  hover:text-red-500
                  hover:bg-red-50
                  transition-all
                  duration-200
                "
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            {/* ==================================================
                BOUTON
            ================================================== */}

            <Button
              type="submit"
              disabled={loading}
              className="
                group/button
                relative
                w-full
                h-12
                overflow-hidden
                bg-red-600
                hover:bg-red-700
                text-white
                font-bold
                rounded-xl
                transition-all
                duration-300
                shadow-lg
                shadow-red-600/20
                hover:shadow-[0_12px_30px_rgba(220,38,38,0.30)]
                hover:-translate-y-0.5
                active:translate-y-0
                disabled:opacity-70
                disabled:hover:translate-y-0
              "
            >

              {!loading && (
                <span
                  className="
                    absolute
                    inset-0
                    -translate-x-full
                    group-hover/button:translate-x-full
                    transition-transform
                    duration-700
                    bg-gradient-to-r
                    from-transparent
                    via-white/20
                    to-transparent
                  "
                />
              )}

              <span
                className="
                  relative
                  z-10
                  flex
                  items-center
                  justify-center
                  gap-2
                "
              >
                {loading ? (
                  <>
                    <span
                      className="
                        h-4
                        w-4
                        rounded-full
                        border-2
                        border-white/30
                        border-t-white
                        animate-spin
                      "
                    />

                    Authentification...
                  </>
                ) : (
                  <>
                    SE CONNECTER

                    <ArrowRight
                      size={18}
                      className="
                        transition-transform
                        duration-300
                        group-hover/button:translate-x-1
                      "
                    />
                  </>
                )}
              </span>
            </Button>
          </form>

          {/* ====================================================
              SÉCURITÉ
          ==================================================== */}

          <div
            className="
              mt-6
              pt-5
              border-t
              border-slate-200/70
              flex
              items-center
              justify-center
              gap-2
              text-xs
              text-slate-400
            "
          >
            <ShieldCheck size={14} />

            <span>Chiffrement AES-256 actif</span>
          </div>
        </div>

        {/* ======================================================
            FOOTER
        ====================================================== */}

        <div className="mt-6 text-center">

          <p
            className="
              text-[10px]
              uppercase
              tracking-[0.14em]
              text-slate-400
            "
          >
            © 2026 LE DAYA — Tous droits réservés
          </p>

          {/* ====================================================
              SIGNATURE AUTEUR
          ==================================================== */}

          <div className="mt-3 flex justify-center">

            <div
              className="
                group/author
                relative
                inline-flex
                items-center
                gap-2
                px-4
                py-2
                rounded-full
                bg-white/40
                backdrop-blur-md
                border
                border-white/60
                shadow-sm
                transition-all
                duration-500
                hover:-translate-y-1
                hover:bg-white/70
                hover:border-red-200
                hover:shadow-[0_8px_25px_rgba(220,38,38,0.12)]
              "
            >

              {/* Point lumineux */}
              <span className="relative flex h-1.5 w-1.5">

                <span
                  className="
                    absolute
                    inline-flex
                    h-full
                    w-full
                    rounded-full
                    bg-red-500
                    opacity-50
                    animate-ping
                  "
                />

                <span
                  className="
                    relative
                    inline-flex
                    h-1.5
                    w-1.5
                    rounded-full
                    bg-red-500
                  "
                />
              </span>

              <span
                className="
                  text-[8px]
                  sm:text-[9px]
                  uppercase
                  tracking-[0.16em]
                  text-slate-400
                  transition-colors
                  duration-300
                  group-hover/author:text-red-600
                "
              >
                Conçu & développé par
              </span>

              <span
                className="
                  text-[9px]
                  sm:text-[10px]
                  font-bold
                  tracking-[0.06em]
                  text-slate-600
                  transition-all
                  duration-300
                  group-hover/author:text-red-600
                "
              >
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
          from {
            opacity: 0;
            transform: translateY(20px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }

        @keyframes glow-red {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.7;
          }

          50% {
            transform: scale(1.08);
            opacity: 1;
          }
        }

        .animate-glow-red {
          animation: glow-red 7s ease-in-out infinite;
        }

        @keyframes glow-blue {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.6;
          }

          50% {
            transform: scale(1.1);
            opacity: 0.9;
          }
        }

        .animate-glow-blue {
          animation: glow-blue 9s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}