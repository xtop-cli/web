<h1 align="center">Colores</h1>

<p>Cada tema (formato v2 de UX8.1) lleva un par explícito de
<code>background</code>/<code>foreground</code> más una
<code>palette</code> de 16 colores hexadecimales. El fondo (background) es el
fondo de pantalla/marco contra el que se mide cualquier otro rol; el primer
plano (foreground) es el color de texto principal. Los ficheros sin el par
explícito (temas heredados de terceros) caen a la ranura 0 / ranura 7 al
cargar.</p>

<p>Al cargar, el kernel <strong>normaliza</strong> el tema (UX8.2): los roles de
texto y marcas que no alcanzan su mínimo de contraste WCAG contra el fondo se
elevan automáticamente, de forma determinista y preservando el tono (ver
<a href="customization.md#contrast-normalization">customization.md —
Normalización de contraste</a>). Los ficheros incluidos abajo permanecen
canónicos: son las paletas propietarias exactas; el tema en memoria es la
vista de ejecución con legibilidad garantizada.</p>

<p>Las ranuras no son arbitrarias: cada una es un <strong>rol</strong> fijo
(los packs de widgets las leen mediante las constantes <code>ROLE_*</code> y el
chrome del kernel mediante <code>Theme::bg()/fg()/accent()/dim()</code>). Esta
leyenda es el resumen; la tabla completa de fuente única con el uso por rol
vive en
<a href="customization.md#palette-reference">customization.md — Referencia de la paleta</a>.
Todas las paletas de abajo mantienen los mismos roles de ranura (alias de fondo
heredado en 0, accent en 6, alias de primer plano heredado en 7, dim en 8,
rampa brillante de series desde 9); solo varían los tonos de cada tema: los
temas claros como <code>helsinki</code> o <code>madrid</code> simplemente
eligen tonos más oscuros para los mismos roles de modo que el contraste
funcione sobre un fondo claro.</p>

<table align="center">
  <thead>
    <tr><th>Ranura</th><th>Rol</th></tr>
  </thead>
  <tbody>
    <tr><td><code>background</code></td><td>fondo explícito — fondo de pantalla/marco; <code>Theme::bg()</code></td></tr>
    <tr><td><code>foreground</code></td><td>primer plano explícito — texto principal; <code>Theme::fg()</code></td></tr>
    <tr><td><code>0</code></td><td>alias de fondo heredado (<code>ROLE_BG</code>); coincide con <code>background</code> en todos los temas incluidos excepto <code>x</code>, donde la paleta propietaria conserva un negro de terminal ligeramente más claro</td></tr>
    <tr><td><code>1</code></td><td>alert (rellenos de nivel alto, línea media de CPU)</td></tr>
    <tr><td><code>2</code></td><td>good (rellenos normales, línea de RAM, batería)</td></tr>
    <tr><td><code>3</code></td><td>warn (parada media del degradado)</td></tr>
    <tr><td><code>4</code></td><td>read / RX (RX de red, lecturas de disco)</td></tr>
    <tr><td><code>5</code></td><td>write / TX / GPU (TX de red, escrituras de disco)</td></tr>
    <tr><td><code>6</code></td><td>accent (títulos, cabeceras, selección)</td></tr>
    <tr><td><code>7</code></td><td>alias de primer plano heredado (<code>ROLE_FG</code>) — los renderers de texto usan el <code>foreground</code> explícito; la ranura 7 es el ancla casi blanca de la familia de tono base y puede legítimamente igualar el fondo (París lo hace)</td></tr>
    <tr><td><code>8</code></td><td>dim (filas cebra, separadores, divisores)</td></tr>
    <tr><td><code>9</code>-<code>15</code></td><td>rampa brillante de series (gráficos de varias series)</td></tr>
  </tbody>
</table>

<br>

<h2 align="center">X</h2>

```json
{
    "color0":  "#0a0a0a",
    "color1":  "#fc618d",
    "color2":  "#7bd88f",
    "color3":  "#fce566",
    "color4":  "#fd9353",
    "color5":  "#948ae3",
    "color6":  "#5ad4e6",
    "color7":  "#f7f1ff",
    "color8":  "#0f0f0f",
    "color9":  "#fc618d",
    "color10": "#7bd88f",
    "color11": "#fce566",
    "color12": "#fd9353",
    "color13": "#948ae3",
    "color14": "#5ad4e6",
    "color15": "#f7f1ff",
    "background": "#050505",
    "foreground": "#f7f1ff"
}
```
</h2>

<h2 align="center">Madrid</h2>

```json
{
    "color0":  "#fafafa",
    "color1":  "#990026",
    "color2":  "#007a28",
    "color3":  "#8a6408",
    "color4":  "#007a9e",
    "color5":  "#4d2699",
    "color6":  "#007a9e",
    "color7":  "#1a1a1a",
    "color8":  "#4d4d4d",
    "color9":  "#990026",
    "color10": "#007a28",
    "color11": "#8a6408",
    "color12": "#007a9e",
    "color13": "#4d2699",
    "color14": "#007a9e",
    "color15": "#1a1a1a",
    "background": "#fafafa",
    "foreground": "#1a1a1a"
}
```
</h2>

<h2 align="center">Lahabana</h2>

```json
{
    "color0":  "#19191a",
    "color1":  "#fc618d",
    "color2":  "#7bd88f",
    "color3":  "#e5ff9d",
    "color4":  "#fd9353",
    "color5":  "#948ae3",
    "color6":  "#5ad4e6",
    "color7":  "#f7f1ff",
    "color8":  "#19191a",
    "color9":  "#fc618d",
    "color10": "#7bd88f",
    "color11": "#e5ff9d",
    "color12": "#fd9353",
    "color13": "#948ae3",
    "color14": "#5ad4e6",
    "color15": "#f7f1ff",
    "background": "#19191a",
    "foreground": "#f7f1ff"
}
```
</h2>

<h2 align="center">Miami</h2>

```json
{
    "color0":  "#000000",
    "color1":  "#FF4C8B",
    "color2":  "#7FFFD4",
    "color3":  "#FFD84C",
    "color4":  "#00FFA8",
    "color5":  "#D36CFF",
    "color6":  "#47CFFF",
    "color7":  "#f7f1ff",
    "color8":  "#69676c",
    "color9":  "#FF4C8B",
    "color10": "#7FFFD4",
    "color11": "#FFD84C",
    "color12": "#00FFA8",
    "color13": "#D36CFF",
    "color14": "#47CFFF",
    "color15": "#f7f1ff",
    "background": "#000000",
    "foreground": "#f7f1ff"
}
```
</h2>

<h2 align="center">Paris</h2>

```json
{
    "color0":  "#1a0a30",
    "color1":  "#fc618d",
    "color2":  "#7bd88f",
    "color3":  "#fce566",
    "color4":  "#a3f3ff",
    "color5":  "#c4bdff",
    "color6":  "#a3f3ff",
    "color7":  "#1a0a30",
    "color8":  "#c4bdff",
    "color9":  "#fc618d",
    "color10": "#7bd88f",
    "color11": "#fce566",
    "color12": "#a3f3ff",
    "color13": "#c4bdff",
    "color14": "#a3f3ff",
    "color15": "#f7f1ff",
    "background": "#1a0a30",
    "foreground": "#f7f1ff"
}
```
</h2>

<h2 align="center">Tokio</h2>

```json
{
    "color0":  "#1c1c1d",
    "color1":  "#fc618d",
    "color2":  "#7bd88f",
    "color3":  "#fce566",
    "color4":  "#fd9353",
    "color5":  "#948ae3",
    "color6":  "#5ad4e6",
    "color7":  "#f7f1ff",
    "color8":  "#1c1c1d",
    "color9":  "#fc618d",
    "color10": "#7bd88f",
    "color11": "#fce566",
    "color12": "#fd9353",
    "color13": "#948ae3",
    "color14": "#5ad4e6",
    "color15": "#f7f1ff",
    "background": "#1c1c1d",
    "foreground": "#f7f1ff"
}
```
</h2>

<h2 align="center">Oslo</h2>

```json
{
    "color0":  "#3f4451",
    "color1":  "#e05561",
    "color2":  "#8cc265",
    "color3":  "#d18f52",
    "color4":  "#4aa5f0",
    "color5":  "#c162de",
    "color6":  "#42b3c2",
    "color7":  "#e6e6e6",
    "color8":  "#4f5666",
    "color9":  "#ff616e",
    "color10": "#a5e075",
    "color11": "#f0a45d",
    "color12": "#4dc4ff",
    "color13": "#de73ff",
    "color14": "#4cd1e0",
    "color15": "#ffffff",
    "background": "#3f4451",
    "foreground": "#abb2bf"
}
```
</h2>

<h2 align="center">Helsinki</h2>

```json
{
    "color0":  "#f8fafe",
    "color1":  "#1faa9e",
    "color2":  "#733d9a",
    "color3":  "#2e70ad",
    "color4":  "#b55a0f",
    "color5":  "#3e9d21",
    "color6":  "#bd4c3d",
    "color7":  "#544d40",
    "color8":  "#b0a999",
    "color9":  "#009e91",
    "color10": "#5a1f8a",
    "color11": "#0f5ba2",
    "color12": "#b23b00",
    "color13": "#218c00",
    "color14": "#b32e1f",
    "color15": "#000000",
    "background": "#f8fafe",
    "foreground": "#544d40"
}
```
</h2>

<h2 align="center">Berlin</h2>

```json
{
    "color0":  "#000000",
    "color1":  "#999999",
    "color2":  "#bbbbbb",
    "color3":  "#dddddd",
    "color4":  "#888888",
    "color5":  "#aaaaaa",
    "color6":  "#cccccc",
    "color7":  "#ffffff",
    "color8":  "#333333",
    "color9":  "#bbbbbb",
    "color10": "#dddddd",
    "color11": "#ffffff",
    "color12": "#aaaaaa",
    "color13": "#cccccc",
    "color14": "#eeeeee",
    "color15": "#ffffff",
    "background": "#000000",
    "foreground": "#cccccc"
}
```
</h2>

<h2 align="center">London</h2>

```json
{
    "color0":  "#ffffff",
    "color1":  "#333333",
    "color2":  "#444444",
    "color3":  "#555555",
    "color4":  "#666666",
    "color5":  "#777777",
    "color6":  "#888888",
    "color7":  "#333333",
    "color8":  "#333333",
    "color9":  "#444444",
    "color10": "#555555",
    "color11": "#666666",
    "color12": "#777777",
    "color13": "#888888",
    "color14": "#999999",
    "color15": "#aaaaaa",
    "background": "#ffffff",
    "foreground": "#333333"
}
```
</h2>

<h2 align="center">Praha</h2>

```json
{
    "color0":  "#1A1A1A",
    "color1":  "#FF5555",
    "color2":  "#B8E6A0",
    "color3":  "#FFE4A3",
    "color4":  "#BD93F9",
    "color5":  "#FF9AA2",
    "color6":  "#8BE9FD",
    "color7":  "#FFFFFF",
    "color8":  "#6272A4",
    "color9":  "#FF6E6E",
    "color10": "#B8E6A0",
    "color11": "#FFE4A3",
    "color12": "#D6ACFF",
    "color13": "#FF9AA2",
    "color14": "#A4FFFF",
    "color15": "#FFFFFF",
    "background": "#1a1a1a",
    "foreground": "#ffffff"
}
```
</h2>

<h2 align="center">Bogota</h2>

```json
{
    "color0":  "#200b0a",
    "color1":  "#fc618d",
    "color2":  "#7bd88f",
    "color3":  "#ffed89",
    "color4":  "#47e6ff",
    "color5":  "#ff9999",
    "color6":  "#47e6ff",
    "color7":  "#f7f1ff",
    "color8":  "#525053",
    "color9":  "#fc618d",
    "color10": "#7bd88f",
    "color11": "#ffed89",
    "color12": "#47e6ff",
    "color13": "#ff9999",
    "color14": "#47e6ff",
    "color15": "#f7f1ff",
    "background": "#200b0a",
    "foreground": "#f7f1ff"
}
```
