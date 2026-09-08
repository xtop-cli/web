<span class="kicker">xtop-cli / documentation</span>

# Documentation

All the **xtop-cli** ecosystem documentation, in one place. These pages are a
faithful mirror of the `README.md` and `docs/` files of every repository —
nothing here has been rewritten: if a repo changes, its documentation
changes. A translated Spanish mirror lives at [/docs/es](/docs/es/).

The ecosystem is split into seven repositories with a single dependency
rule: every consumer depends only on the contract crates in
[`api`](/docs/en/api/) — never on the kernel — so each repo compiles
standalone.

| Repo | Role | Content |
|---|---|---|
| [`xtop`](/docs/en/xtop/) | kernel | the app: single-crate binary; consumes every other repo |
| [`api`](/docs/en/api/) | contracts | `xtop-plugin-api` · `xtop-widget-api` · `xtop-effect-api` · `xtop-extension-api` |
| [`widgets`](/docs/en/widgets/) | renderers | widget packs over `xtop-widget-api` (default pack + blocks) |
| [`layouts`](/docs/en/layouts/) | arrangement | `xtop-layout`: layout model, JSONC loader, modes, presets |
| [`plugins`](/docs/en/plugins/) | functionality | plugin implementations (first member: `xtop-plugin-samurai`) |
| [`extensions`](/docs/en/extensions/) | kernel hooks | server-style extensions (first member: `xtop-extension-mcp`) |
| [`effects`](/docs/en/effects/) | animation | frame effects (first member: `xtop-effect-fade`) |

## Start here

If you are new to the code, the natural order is:

1. **What it is** → [features](/docs/en/xtop/docs/features/) and the
   [kernel README](/docs/en/xtop/)
2. **Install it** → [installation](/docs/en/xtop/docs/installation/) — Linux,
   Windows, macOS and building from source
3. **Use it** → [usage](/docs/en/xtop/docs/usage/) — keybindings, modules,
   responsive layouts
4. **Configure it** → [configuration](/docs/en/xtop/docs/configuration/) and
   [customization](/docs/en/xtop/docs/customization/) (JSONC themes and layouts)
5. **Colors** → [colors](/docs/en/xtop/docs/colors/) — the 12 palettes
6. **Develop** → contracts in [api](/docs/en/api/), packs in
   [widgets authoring](/docs/en/widgets/docs/authoring/), plugins and MCP in
   [plugins](/docs/en/plugins/) and
   [extensions MCP protocol](/docs/en/extensions/docs/mcp-protocol/)

> Note: links between files are resolved automatically to the equivalent
> local route when the target is mirrored here; everything else points to the
> real `blob` on GitHub.

## Mirrors

| Repository | Files |
|---|---|
| `xtop-cli/api` | `README.md`, `docs/*.md` |
| `xtop-cli/effects` | `README.md`, `docs/*.md` |
| `xtop-cli/extensions` | `README.md`, `docs/*.md`, `extensions/xtop-extension-mcp/README.md` |
| `xtop-cli/layouts` | `README.md`, `docs/*.md`, `layouts/custom/README.md` |
| `xtop-cli/plugins` | `README.md`, `docs/*.md`, `plugins/xtop-plugin-samurai/README.md` |
| `xtop-cli/widgets` | `README.md`, `docs/*.md`, `custom/README.md` |
| `xtop-cli/xtop` | `README.md`, `docs/*.md`, `ROADMAP.md`, `CHANGELOG.md`, `CONTRIBUTING.md` |
