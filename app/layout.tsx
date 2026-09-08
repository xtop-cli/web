import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import PageShell from "@/components/page-shell";

const hack = localFont({
  src: [
    { path: "./fonts/HackNerdFontMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/HackNerdFontMono-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-hack",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://xtop-cli.github.io/web"),
  title: {
    default: "Xtop — a cross-platform TUI system monitor",
    template: "%s · Xtop",
  },
  description:
    "Xtop is a cross-platform TUI system monitor written in Rust with ratatui: CPU, memory, network, storage, processes, GPU, battery, 12 themes and a modular plugin ecosystem.",
  keywords: ["xtop", "tui", "system monitor", "rust", "ratatui", "terminal", "sysinfo"],
  authors: [{ name: "xtop-cli", url: "https://github.com/xtop-cli" }],
  openGraph: {
    type: "website",
    siteName: "Xtop",
    title: "Xtop — a cross-platform TUI system monitor",
    description:
      "Terminal system monitoring in Rust: CPU, memory, network, storage, processes, GPU and battery — with 12 themes and a plugin ecosystem.",
  },
  // icons via file-system conventions: app/icon.png, app/apple-icon.png, app/favicon.ico
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
          Skip to content
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
