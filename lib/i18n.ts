export type Locale = "es" | "en";

export const DEFAULT_LOCALE: Locale = "es";

/** Map a URL path to its content locale:
 *  - /docs/es/*      → es (Spanish docs)
 *  - /en*, /docs/en/*, /docs/* (English alias) → en
 *  - / (Spanish landing) and anything else → es */
export function localeFromPath(pathname: string | null): Locale {
  if (!pathname) return DEFAULT_LOCALE;
  if (pathname.startsWith("/docs/es")) return "es";
  if (pathname.startsWith("/en") || pathname.startsWith("/docs/")) return "en";
  return "es";
}

export const isEnPath = (p: string | null) => localeFromPath(p) === "en";

/** Hub path for a docs locale (Spanish docs live at /docs/es, English at /docs/en). */
export const docsHub = (locale: Locale) => `/docs/${locale}/`;

export const ASSET_BASE = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? "";
export const asset = (p: string) => `${ASSET_BASE}${p}`;

/* ------------------------------------------------------------------ */

export interface Stat {
  n: number;
  suffix: string;
  label: string;
}

export interface FeatureCopy {
  title: string;
  body: string;
  tags: string[];
}

export interface PreviewCopy {
  cap: string;
  badge: string;
}

export interface InstallCopy {
  head: string;
  hint: string;
  code: string;
}

export interface KeyRow {
  what: string;
  k: string;
}

export interface Copy {
  langName: string;
  meta: { title: string; description: string };
  header: {
    home: string;
    docs: string;
    github: string;
    switchTo: string;
    switchLabel: string;
    toggleLight: string;
    toggleDark: string;
    skip: string;
  };
  hero: {
    kicker: string;
    title: string[]; // [pre, hl1, mid, hl2, post]
    lede: string;
    ctaInstall: string;
    ctaDocs: string;
  };
  badges: string[];
  stats: Stat[];
  features: {
    kicker: string;
    title: string;
    note: string;
    items: FeatureCopy[];
  };
  screenshots: {
    kicker: string;
    title: string;
    note: string;
    items: PreviewCopy[];
  };
  palettes: {
    kicker: string;
    title: string;
    note: string;
    siteDark: string;
    siteLight: string;
    reference: string;
  };
  ecosystem: {
    kicker: string;
    title: string;
    note: string;
  };
  install: {
    kicker: string;
    title: string;
    note: string;
    panels: InstallCopy[];
    notes: { title: string; body: string }[];
  };
  keys: {
    kicker: string;
    title: string;
    note: string;
    rows: KeyRow[];
  };
  cta: {
    title: string;
    body: string;
    github: string;
    docs: string;
  };
  footer: {
    about: string;
    ecosystem: string;
    docs: string;
    resources: string;
    license: string;
    themeNote: string;
    quick: {
      installation: string;
      usage: string;
      configuration: string;
      colors: string;
      roadmap: string;
    };
  };
}

/* ================================================================== */
/*                              ESPAÑOL                                */
/* ================================================================== */

const ES: Copy = {
  langName: "Español",
  meta: {
    title: "Xtop — monitor de sistema TUI multiplataforma",
    description:
      "Xtop es un monitor de sistema TUI multiplataforma escrito en Rust con ratatui: CPU, memoria, red, almacenamiento, procesos, GPU, batería, 12 temas y un ecosistema modular de plugins.",
  },
  header: {
    home: "Inicio",
    docs: "Docs",
    github: "GitHub",
    switchTo: "Switch to English",
    switchLabel: "EN",
    toggleLight: "Cambiar a tema claro (Madrid)",
    toggleDark: "Cambiar a tema oscuro (X)",
    skip: "Saltar al contenido",
  },
  hero: {
    kicker: "TUI system monitor · Rust",
    title: [
      "Monitoriza tu sistema ",
      "dentro",
      " de la ",
      "terminal",
      ".",
    ],
    lede: "**xtop** es un monitor de sistema TUI multiplataforma escrito en `Rust`: renderizado con `ratatui`, métricas reales con `sysinfo`, y un kernel fino rodeado de un ecosistema modular — widgets, layouts, plugins, extensiones y efectos. El proyecto vive en la organización `github.com/xtop-cli`.",
    ctaInstall: "Instalar",
    ctaDocs: "Documentación",
  },
  badges: ["Rust 1.87+", "ratatui", "sysinfo", "linux · macOS · windows", "MIT"],
  stats: [
    { n: 7, suffix: "", label: "repositorios · kernel + 6 áreas" },
    { n: 41, suffix: "", label: "archivos de documentación espejados" },
    { n: 12, suffix: "", label: "temas, con paleta de 16 roles" },
    { n: 11, suffix: "", label: "widgets en el pack base (+ blocks)" },
    { n: 12, suffix: "", label: "acciones JSON del plugin samurai" },
    { n: 10, suffix: "", label: "reglas heurísticas de detección" },
    { n: 500, suffix: " ms", label: "fade-in del efecto fade" },
  ],
  features: {
    kicker: "features",
    title: "Lo que xtop mide — y cómo lo pinta",
    note: "Métricas reales, sin datos inventados: si el hardware no expone una lectura, el widget muestra su estado vacío honesto. Resumen tomado de [docs/features.md](/docs/es/xtop/docs/features/).",
    items: [
      {
        title: "CPU",
        body: "Uso por núcleo e hilo con gauges horizontales, temperatura máxima por sensores y gráfico histórico.",
        tags: ["per-core", "temps"],
      },
      {
        title: "Memory",
        body: "Gauges de RAM y Swap con gráfico de línea histórico y ventana de puntos configurable.",
        tags: ["ram", "swap", "history"],
      },
      {
        title: "Network",
        body: "Seguimiento RX/TX en tiempo real por interfaz, con totales y gráfico dual de serie.",
        tags: ["rx", "tx", "per-iface"],
      },
      {
        title: "Storage · Disk I/O",
        body: "Gauges de uso por punto de montaje y velocidades de lectura/escritura por dispositivo en bytes/s.",
        tags: ["mounts", "read/write"],
      },
      {
        title: "Processes",
        body: "Lista con búsqueda en vivo, orden por CPU/Mem/PID/Name con marcador de dirección y selección anclada a PID.",
        tags: ["search", "sort", "kill"],
      },
      {
        title: "GPU · Battery",
        body: "GPU por nvidia-smi (NVIDIA, cualquier SO) o sysfs en Linux; batería real en Linux, macOS y Windows.",
        tags: ["real probes", "honest empty"],
      },
      {
        title: "Themes",
        body: "12 temas con rol fijo por slot, contraste normalizado (WCAG) y cambio instantáneo con t/T.",
        tags: ["jsonc", "12 themes", "wcag"],
      },
      {
        title: "Layouts",
        body: "7 modos + 3 presets Detail, layouts JSONC recursivos, degradación por tamaño de terminal y full-screen.",
        tags: ["dashboard", "focus modes", "jsonc"],
      },
      {
        title: "Plugins & MCP",
        body: "samurai expone 12 acciones JSON y 10 reglas de alerta; el servidor MCP las ofrece como tools a agentes de IA.",
        tags: ["samurai", "mcp", "json-rpc"],
      },
      {
        title: "Effects",
        body: "Efectos de frame sobre el buffer final: fade-in de 500 ms determinista, con contrato en xtop-effect-api.",
        tags: ["fade", "500ms"],
      },
    ],
  },
  screenshots: {
    kicker: "screenshots",
    title: "Así se ve en una terminal real",
    note: "Capturas del repo del kernel (**xtop/assets/previews**). Cada layout responde al ancho y alto de tu terminal, con un suelo de 40×8.",
    items: [
      { cap: "Dashboard", badge: "layout por defecto" },
      { cap: "Detail Processes", badge: "detalle de procesos" },
      { cap: "Detail Network", badge: "red e interfaces" },
      { cap: "Detail Dashboard", badge: "cpu · summary · sensors" },
      { cap: "Process Focus", badge: "procesos" },
      { cap: "Process Focus", badge: "theme berlin" },
      { cap: "xtop en Windows", badge: "monitor de sistema" },
      { cap: "xtop en Windows", badge: "monitor de sistema" },
    ],
  },
  palettes: {
    kicker: "colors",
    title: "Doce paletas, un contrato de roles",
    note: "Cada tema es un par `background`/`foreground` más 16 slots con **rol fijo** (alert, good, warn, rx, tx, accent, dim, serie). Este sitio usa **X** en oscuro y **Madrid** en claro, desde [xscriptor-colors/assets](https://github.com/xscriptor-colors/assets).",
    siteDark: "este sitio: dark",
    siteLight: "este sitio: light",
    reference: "Referencia completa de slots y roles en [docs/colors.md](/docs/es/xtop/docs/colors/).",
  },
  ecosystem: {
    kicker: "ecosystem",
    title: "Siete repos, una sola fuente de contratos",
    note: "Cada repo compila standalone contra los contratos de [api](/docs/es/api/) — nunca contra el kernel. Documentación completa, espejada desde cada repositorio, en [/docs/es](/docs/es/).",
  },
  install: {
    kicker: "install",
    title: "En marcha en un minuto",
    note: "`install.sh` detecta la distro, instala Rust si falta, compila en release y deja el binario en `/usr/local/bin`. Guía completa en [docs/installation.md](/docs/es/xtop/docs/installation/).",
    panels: [
      {
        head: "Linux · cualquier distro",
        hint: "detecta el gestor de paquetes",
        code: "curl -fsSL https://raw.githubusercontent.com/xtop-cli/xtop/main/install.sh | bash",
      },
      {
        head: "Windows · PowerShell",
        hint: "requiere Rust (cargo)",
        code: "irm https://raw.githubusercontent.com/xtop-cli/xtop/main/install.ps1 | iex",
      },
      {
        head: "macOS · cargo",
        hint: "también vale para cualquier otra plataforma",
        code: "cargo install --git https://github.com/xtop-cli/xtop --all-features",
      },
      {
        head: "Build desde fuente",
        hint: "release optimizado",
        code: "git clone https://github.com/xtop-cli/xtop.git\ncd xtop\ncargo run --release",
      },
    ],
    notes: [
      {
        title: "Uninstall",
        body: "Linux: `curl -fsSL …/install.sh | bash -s -- --uninstall` · Windows: `irm …/uninstall.ps1 | iex`. La configuración de usuario se conserva.",
      },
      {
        title: "Primera ejecución",
        body: "Al salir con `q` se guarda `config.json` y se siembran los 12 temas y 10 layouts en el directorio de configuración de tu plataforma.",
      },
    ],
  },
  keys: {
    kicker: "usage",
    title: "Teclas esenciales",
    note: "Todo es reasignable en `config.json`. La lista completa está en [docs/usage.md](/docs/es/xtop/docs/usage/) y dentro de la app con `?`.",
    rows: [
      { what: "salir (guarda la config)", k: "q" },
      { what: "ayuda / keybindings", k: "?" },
      { what: "siguiente / anterior tema", k: "t / T" },
      { what: "siguiente layout", k: "l" },
      { what: "full-screen / ciclar widget", k: "f / F" },
      { what: "buscar procesos", k: "/" },
      { what: "paleta de comandos", k: "ctrl+p" },
      { what: "matar proceso seleccionado", k: "k" },
      { what: "ciclar columna de orden", k: "s" },
    ],
  },
  cta: {
    title: "¿Quieres aportar código?",
    body: "Cada área es un repo independiente: widget packs, layouts, plugins, efectos o extensiones se contribuyen sin tocar el kernel. Empieza por **CONTRIBUTING** y el **roadmap**.",
    github: "github.com/xtop-cli →",
    docs: "Explorar docs",
  },
  footer: {
    about:
      "Monitor de sistema TUI multiplataforma escrito en Rust. Renderizado con ratatui, medido con sysinfo — un kernel fino al centro de un ecosistema modular.",
    ecosystem: "Ecosistema",
    docs: "Docs",
    resources: "Recursos",
    license: "© 2026 xtop-cli · MIT License · Rust 1.87+",
    themeNote: "Oscuro: X · Claro: Madrid — temas de",
    quick: {
      installation: "Instalación",
      usage: "Uso",
      configuration: "Configuración",
      colors: "Colores",
      roadmap: "Roadmap",
    },
  },
};

/* ================================================================== */
/*                              ENGLISH                               */
/* ================================================================== */

const EN: Copy = {
  langName: "English",
  meta: {
    title: "Xtop — a cross-platform TUI system monitor",
    description:
      "Xtop is a cross-platform TUI system monitor written in Rust with ratatui: CPU, memory, network, storage, processes, GPU, battery, 12 themes and a modular plugin ecosystem.",
  },
  header: {
    home: "Home",
    docs: "Docs",
    github: "GitHub",
    switchTo: "Cambiar a español",
    switchLabel: "ES",
    toggleLight: "Switch to light theme (Madrid)",
    toggleDark: "Switch to dark theme (X)",
    skip: "Skip to content",
  },
  hero: {
    kicker: "TUI system monitor · Rust",
    title: [
      "Watch your ",
      "system",
      " from your ",
      "terminal",
      ".",
    ],
    lede: "**xtop** is a cross-platform TUI system monitor written in `Rust`: rendered with `ratatui`, measured with real `sysinfo` metrics, and built as a thin kernel around a modular ecosystem — widgets, layouts, plugins, extensions and effects. The project lives in the `github.com/xtop-cli` organization.",
    ctaInstall: "Install",
    ctaDocs: "Documentation",
  },
  badges: ["Rust 1.87+", "ratatui", "sysinfo", "linux · macOS · windows", "MIT"],
  stats: [
    { n: 7, suffix: "", label: "repositories · kernel + 6 areas" },
    { n: 41, suffix: "", label: "documentation files mirrored" },
    { n: 12, suffix: "", label: "themes with a fixed 16-role palette" },
    { n: 11, suffix: "", label: "widgets in the base pack (+ blocks)" },
    { n: 12, suffix: "", label: "samurai plugin JSON actions" },
    { n: 10, suffix: "", label: "heuristic detection rules" },
    { n: 500, suffix: " ms", label: "fade-in of the fade effect" },
  ],
  features: {
    kicker: "features",
    title: "What xtop measures — and how it paints it",
    note: "Real metrics, no fabricated data: when the hardware exposes no reading, the widget shows its honest empty state. Summary taken from [docs/features.md](/docs/en/xtop/docs/features/).",
    items: [
      {
        title: "CPU",
        body: "Usage per core and thread with horizontal gauges, max temperature from hardware sensors, and a historical chart.",
        tags: ["per-core", "temps"],
      },
      {
        title: "Memory",
        body: "RAM and Swap gauges with a historical line chart and a configurable history window.",
        tags: ["ram", "swap", "history"],
      },
      {
        title: "Network",
        body: "Real-time RX/TX tracking per interface, with totals and a dual-series chart.",
        tags: ["rx", "tx", "per-iface"],
      },
      {
        title: "Storage · Disk I/O",
        body: "Usage gauges per mount point and read/write speeds per device, in bytes per second.",
        tags: ["mounts", "read/write"],
      },
      {
        title: "Processes",
        body: "Live search, CPU/Mem/PID/Name sorting with direction marker, and PID-anchored selection.",
        tags: ["search", "sort", "kill"],
      },
      {
        title: "GPU · Battery",
        body: "GPU via nvidia-smi (NVIDIA, any OS) or sysfs on Linux; real battery probes on Linux, macOS and Windows.",
        tags: ["real probes", "honest empty"],
      },
      {
        title: "Themes",
        body: "12 themes with fixed per-slot roles, WCAG-normalized contrast, and instant cycling with t/T.",
        tags: ["jsonc", "12 themes", "wcag"],
      },
      {
        title: "Layouts",
        body: "7 modes + 3 Detail presets, recursive JSONC layouts, terminal-size degradation and full-screen.",
        tags: ["dashboard", "focus modes", "jsonc"],
      },
      {
        title: "Plugins & MCP",
        body: "samurai exposes 12 JSON actions and 10 alert rules; the MCP server offers them as tools to AI agents.",
        tags: ["samurai", "mcp", "json-rpc"],
      },
      {
        title: "Effects",
        body: "Frame effects over the final buffer: a deterministic 500 ms fade-in, contracted in xtop-effect-api.",
        tags: ["fade", "500ms"],
      },
    ],
  },
  screenshots: {
    kicker: "screenshots",
    title: "This is how it looks in a real terminal",
    note: "Captures from the kernel repo (**xtop/assets/previews**). Every layout adapts to the terminal width and height, with a hard floor of 40×8.",
    items: [
      { cap: "Dashboard", badge: "default layout" },
      { cap: "Detail Processes", badge: "process detail" },
      { cap: "Detail Network", badge: "network & interfaces" },
      { cap: "Detail Dashboard", badge: "cpu · summary · sensors" },
      { cap: "Process Focus", badge: "processes" },
      { cap: "Process Focus", badge: "berlin theme" },
      { cap: "xtop on Windows", badge: "system monitor" },
      { cap: "xtop on Windows", badge: "system monitor" },
    ],
  },
  palettes: {
    kicker: "colors",
    title: "Twelve palettes, one role contract",
    note: "Every theme is a `background`/`foreground` pair plus 16 slots with a **fixed role** (alert, good, warn, rx, tx, accent, dim, series). This site uses **X** in dark and **Madrid** in light, from [xscriptor-colors/assets](https://github.com/xscriptor-colors/assets).",
    siteDark: "this site: dark",
    siteLight: "this site: light",
    reference: "Full slot and role reference in [docs/colors.md](/docs/en/xtop/docs/colors/).",
  },
  ecosystem: {
    kicker: "ecosystem",
    title: "Seven repos, a single source of contracts",
    note: "Each repo compiles standalone against the contracts in [api](/docs/en/api/) — never against the kernel. Full documentation, mirrored from every repository, lives at [/docs/en](/docs/en/).",
  },
  install: {
    kicker: "install",
    title: "Up and running in a minute",
    note: "`install.sh` detects the distribution, installs Rust if missing, builds in release mode and drops the binary into `/usr/local/bin`. Full guide in [docs/installation.md](/docs/en/xtop/docs/installation/).",
    panels: [
      {
        head: "Linux · any distro",
        hint: "detects the package manager",
        code: "curl -fsSL https://raw.githubusercontent.com/xtop-cli/xtop/main/install.sh | bash",
      },
      {
        head: "Windows · PowerShell",
        hint: "requires Rust (cargo)",
        code: "irm https://raw.githubusercontent.com/xtop-cli/xtop/main/install.ps1 | iex",
      },
      {
        head: "macOS · cargo",
        hint: "works on any other platform too",
        code: "cargo install --git https://github.com/xtop-cli/xtop --all-features",
      },
      {
        head: "Build from source",
        hint: "release build",
        code: "git clone https://github.com/xtop-cli/xtop.git\ncd xtop\ncargo run --release",
      },
    ],
    notes: [
      {
        title: "Uninstall",
        body: "Linux: `curl -fsSL …/install.sh | bash -s -- --uninstall` · Windows: `irm …/uninstall.ps1 | iex`. User configuration is kept.",
      },
      {
        title: "First run",
        body: "Quitting with `q` saves `config.json` and seeds the 12 themes and 10 layouts into your platform config directory.",
      },
    ],
  },
  keys: {
    kicker: "usage",
    title: "Essential keys",
    note: "Everything is rebindable in `config.json`. The full list lives in [docs/usage.md](/docs/en/xtop/docs/usage/) and in-app via `?`.",
    rows: [
      { what: "quit (saves config)", k: "q" },
      { what: "help / keybindings", k: "?" },
      { what: "next / previous theme", k: "t / T" },
      { what: "next layout", k: "l" },
      { what: "full-screen / cycle widget", k: "f / F" },
      { what: "search processes", k: "/" },
      { what: "command palette", k: "ctrl+p" },
      { what: "kill selected process", k: "k" },
      { what: "cycle sort column", k: "s" },
    ],
  },
  cta: {
    title: "Want to contribute code?",
    body: "Every area is an independent repo: widget packs, layouts, plugins, effects or extensions are contributed without touching the kernel. Start with **CONTRIBUTING** and the **roadmap**.",
    github: "github.com/xtop-cli →",
    docs: "Browse the docs",
  },
  footer: {
    about:
      "Cross-platform TUI system monitor written in Rust. Rendered with ratatui, measured with sysinfo — a thin kernel at the center of a modular ecosystem.",
    ecosystem: "Ecosystem",
    docs: "Docs",
    resources: "Resources",
    license: "© 2026 xtop-cli · MIT License · Rust 1.87+",
    themeNote: "Dark: X · Light: Madrid — themes from",
    quick: {
      installation: "Installation",
      usage: "Usage",
      configuration: "Configuration",
      colors: "Colors",
      roadmap: "Roadmap",
    },
  },
};

export const COPY: Record<Locale, Copy> = { es: ES, en: EN };
