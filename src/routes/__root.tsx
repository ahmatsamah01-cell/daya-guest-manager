import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ThemeProvider } from "../context/ThemeContext";
import { ButtonThemeProvider } from "../context/ButtonThemeContext";
import { useSettings } from "../context/ThemeContext";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "LE DAYA Hotel Manager" },
      {
        name: "description",
        content:
          "Gestion hôtelière de LE DAYA Guest House à Port-Gentil : chambres, réservations, caisse et facturation.",
      },
      { property: "og:title", content: "LE DAYA Hotel Manager" },
      {
        property: "og:description",
        content: "Notre priorité, votre satisfaction — LE DAYA Guest House, Port-Gentil.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('daya_theme');
                if (theme) {
                  document.documentElement.classList.add('theme-' + theme);
                }
                var mode = localStorage.getItem('daya_mode') || 'dark';
                if (mode === 'dark' || (mode === 'auto' && new Date().getHours() >= 18)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
                var radius = localStorage.getItem('daya_radius');
                if (radius) {
                  var radiusMap = { sm: "0.3rem", lg: "0.75rem", "2xl": "1rem", "3xl": "1.5rem", full: "9999px" };
                  if (radiusMap[radius]) {
                    document.documentElement.style.setProperty("--radius", radiusMap[radius]);
                  }
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// Nouveau composant qui utilise useSettings() et applique le thème global
function AppContent() {
  const { customWallpaperUrl, blurIntensity } = useSettings();

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: customWallpaperUrl
          ? `url(${customWallpaperUrl})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backdropFilter: `blur(${blurIntensity}px)`,
      }}
    >
      <Outlet />
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ButtonThemeProvider>
          <AppContent />
        </ButtonThemeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}