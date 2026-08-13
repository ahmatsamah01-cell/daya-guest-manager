import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  BedDouble,
  Users,
  CalendarCheck,
  Wallet,
  ReceiptText,
  FileSpreadsheet,
  TrendingDown,
  Landmark,
  BarChart3,
  Settings,
  Menu,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useEtablissement, useMonRole } from "@/hooks/use-hotel";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/chambres", label: "Chambres", icon: BedDouble },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/reservations", label: "Réservations", icon: CalendarCheck },
  { to: "/caisse", label: "Caisse", icon: Wallet },
  { to: "/factures", label: "Facturation", icon: ReceiptText },
  { to: "/pcs", label: "Pièces de caisse", icon: FileSpreadsheet },
  { to: "/depenses", label: "Dépenses", icon: TrendingDown },
  { to: "/taxe-sejour", label: "Taxe de séjour", icon: Landmark },
  { to: "/rapports", label: "Rapports", icon: BarChart3 },
  { to: "/parametres", label: "Paramètres", icon: Settings },
] as const;

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: etab } = useEtablissement();
  const { data: role } = useMonRole();
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-5 py-4">
        <div className="rounded-lg bg-white p-2">
          <BrandLogo className="mx-auto max-h-14" />
        </div>
        <p className="mt-2 text-center text-[10px] tracking-widest uppercase opacity-70">
          Hotel Manager
        </p>
        <p className="mt-1 truncate text-center text-[11px] opacity-60 italic">{SLOGAN}</p>
        <p className="mt-1 truncate text-center text-xs opacity-60">
          {etab?.nom ?? "…"} — {etab?.ville ?? ""}
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-sidebar-primary font-medium text-sidebar-primary-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="px-2 pb-2 text-xs opacity-70">
          <p className="truncate">{role?.email ?? ""}</p>
          <p className="uppercase">{role?.roles?.join(", ") || "—"}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/auth" });
          }}
        >
          <LogOut className="size-4" /> Se déconnecter
        </Button>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="hidden w-64 shrink-0 lg:sticky lg:top-0 lg:block lg:h-screen">
        <NavContent />
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 border-0 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <NavContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-card/80 px-4 py-3 backdrop-blur lg:hidden">
          <Button variant="outline" size="icon" onClick={() => setOpen(true)}>
            <Menu className="size-5" />
          </Button>
          <span className="font-display font-semibold">LE DAYA Hotel Manager</span>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
