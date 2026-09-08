export interface Repo {
  key: string; // folder inside docs/
  name: string; // github repo name
  display: string; // human label
  role: string; // short role chip
  description: { en: string; es: string };
  kind: string; // crate | repo etc.
  features: string[];
}

export const REPOS: Repo[] = [
  {
    key: "xtop",
    name: "xtop",
    display: "Xtop",
    role: "kernel",
    kind: "App",
    description: {
      en: "The application itself: a cross-platform TUI system monitor written in Rust. Single-crate kernel with ratatui rendering, sysinfo providers and the command surface (config, themes, layouts, plugins, widgets, MCP).",
      es: "La aplicación en sí: un monitor de sistema TUI multiplataforma escrito en Rust. Kernel de un solo crate con renderizado ratatui, providers de sysinfo y la superficie de comandos (config, temas, layouts, plugins, widgets, MCP).",
    },
    features: ["ratatui", "sysinfo", "crossterm", "Rust 1.87+"],
  },
  {
    key: "api",
    name: "api",
    display: "api",
    role: "contracts",
    kind: "Workspace",
    description: {
      en: "Pure contract crates: xtop-plugin-api, xtop-widget-api, xtop-effect-api and xtop-extension-api. The shared data model (SystemSnapshot, AlertThresholds) lives here; every other repo depends only on this one.",
      es: "Crates de contratos puros: xtop-plugin-api, xtop-widget-api, xtop-effect-api y xtop-extension-api. Aquí vive el modelo de datos compartido (SystemSnapshot, AlertThresholds); el resto de repos solo depende de este.",
    },
    features: ["xtop-plugin-api", "xtop-widget-api", "xtop-effect-api", "xtop-extension-api"],
  },
  {
    key: "widgets",
    name: "widgets",
    display: "widgets",
    role: "renderers",
    kind: "Workspace",
    description: {
      en: "Widget packs of renderers against xtop-widget-api: the default pack (11 widgets) plus the blocks pack — one crate per widget, plus the shared xtop-widget-core engine.",
      es: "Packs de widgets (renderers) contra xtop-widget-api: el pack por defecto (11 widgets) más el pack blocks — un crate por widget, con el motor compartido xtop-widget-core.",
    },
    features: ["cpu", "memory", "network", "processes", "battery", "gpu", "summary", "sensors"],
  },
  {
    key: "layouts",
    name: "layouts",
    display: "layouts",
    role: "arrangement",
    kind: "Crate",
    description: {
      en: "The xtop-layout crate: data-driven layout model, JSONC loader, layout modes and terminal-size degradation. Ships 7 mode layouts + 3 detail presets and hosts the community layouts folder.",
      es: "El crate xtop-layout: modelo de layout guiado por datos, loader JSONC, modos de layout y degradación por tamaño de terminal. Incluye 7 layouts de modo + 3 presets detail y la carpeta de layouts de la comunidad.",
    },
    features: ["JSONC", "splits", "modes", "presets"],
  },
  {
    key: "plugins",
    name: "plugins",
    display: "plugins",
    role: "functionality",
    kind: "Workspace",
    description: {
      en: "Plugin implementations against xtop-plugin-api. First member: xtop-plugin-samurai — an AI-aware plugin exposing 12 JSON actions and 10 heuristic threat-detection rules.",
      es: "Implementaciones de plugins contra xtop-plugin-api. Primer miembro: xtop-plugin-samurai — un plugin consciente de IA con 12 acciones JSON y 10 reglas heurísticas de detección de amenazas.",
    },
    features: ["samurai", "12 actions", "10 rules", "JSON API"],
  },
  {
    key: "extensions",
    name: "extensions",
    display: "extensions",
    role: "kernel hooks",
    kind: "Workspace",
    description: {
      en: "Server-style extensions against xtop-extension-api. First member: xtop-extension-mcp — a Model Context Protocol server over stdio that exposes xtop and its hosted plugins as MCP tools.",
      es: "Extensiones de tipo servidor contra xtop-extension-api. Primer miembro: xtop-extension-mcp — un servidor del Model Context Protocol sobre stdio que expone xtop y sus plugins alojados como tools MCP.",
    },
    features: ["MCP", "JSON-RPC 2.0", "stdio"],
  },
  {
    key: "effects",
    name: "effects",
    display: "effects",
    role: "animation",
    kind: "Workspace",
    description: {
      en: "Frame effects against xtop-effect-api. First member: xtop-effect-fade — fades the rendered frame in from black over 500 ms, deterministic and zero-config.",
      es: "Efectos de frame contra xtop-effect-api. Primer miembro: xtop-effect-fade — funde el frame renderizado desde negro en 500 ms, determinista y sin configuración.",
    },
    features: ["fade", "500 ms", "deterministic"],
  },
];

export const GITHUB_ORG = "https://github.com/xtop-cli";
export const RAW_PREFIX = "https://raw.githubusercontent.com/xtop-cli";
export const XSCRIPTOR = {
  dev: "https://www.xscriptor.io",
  github: "https://github.com/xscriptor",
  web: "https://www.xscriptor.com",
  colors: "https://github.com/xscriptor-colors/assets",
};
