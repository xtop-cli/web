import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "../globals.css";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import PageShell from "@/components/page-shell";
import { COPY } from "@/lib/i18n";

const hack = localFont({
  src: [
    { path: "../fonts/HackNerdFontMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/HackNerdFontMono-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-hack",
  display: "swap",
  preload: true,
});

const bp = process.env.PAGES_BASE_PATH ?? "";

export const metadata: Metadata = {
  metadataBase: new URL("https://xtop-cli.github.io/web"),
  icons: {
    icon: [
      { url: `${bp}/icon.png`, type: "image/png", sizes: "512x512" },
      { url: `${bp}/favicon.ico`, type: "image/x-icon", sizes: "16x16" },
    ],
    apple: [{ url: `${bp}/apple-icon.png` }],
  },
  title: {
    default: COPY.es.meta.title,
    template: "%s · Xtop",
  },
  description: COPY.es.meta.description,
  keywords: ["xtop", "tui", "system monitor", "rust", "ratatui", "terminal", "sysinfo"],
  authors: [{ name: "xtop-cli", url: "https://github.com/xtop-cli" }],
  openGraph: {
    type: "website",
    siteName: "Xtop",
    title: COPY.es.meta.title,
    description: COPY.es.meta.description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#050505" },
  ],
  width: "device-width",
  initialScale: 1,
};

const themeScript = `(function(){try{var t=localStorage.getItem("xtop-theme");if(t!=="dark"&&t!=="light"){t="dark";}document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={hack.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Saltar al contenido
        </a>
        <SiteHeader />
        <main id="main">
          <PageShell>{children}</PageShell>
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
