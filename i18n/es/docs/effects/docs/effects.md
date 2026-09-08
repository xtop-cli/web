# Catálogo de efectos

Efectos de frame integrados que distribuye este repositorio. Todos ellos
implementan el contrato de `xtop-effect-api` (ver `docs/write-effect.md`
para la guía de autoría y el contrato del host). El catálogo es aditivo: un
crate por efecto, una fila por efecto.

## Fade (`xtop-effect-fade`, id del manifest `fade`)

El efecto de fundido de entrada. Tipo: `xtop_effect_fade::FadeEffect` — un
struct unit sin estado y sin configuración de ningún tipo.

### Cómo se ve

Fade toma el frame totalmente renderizado de un tick y funde su contenido RGB
desde negro. Durante la ventana, cada primer plano y fondo `Color::Rgb` se
escala hacia negro; los colores que no son RGB (`Color::Reset`, indexados,
escala de grises) y todos los modificadores de celda nunca se tocan.

- `elapsed == 0`: todos los canales RGB están a cero — el frame es negro
  donde los widgets pintaron colores RGB.
- `elapsed` estrictamente entre 0 y la ventana: cada canal RGB se sitúa en
  `round(channel * alpha)` con `alpha = elapsed / 500 ms`.
- `elapsed >= 500 ms`: intensidad completa.

En un terminal con fondo oscuro por defecto esto se lee como el frame entero
fundiéndose desde negro durante medio segundo. Con un fondo claro por
defecto, el fondo `Color::Reset` (por ejemplo el espacio vacío entre el
texto) es visible de inmediato, mientras que el texto y los fondos RGB
todavía suben desde negro.

### Semántica exacta de la ventana

- Ventana: exactamente `FADE_DURATION = 500 ms` (una `const` del crate),
  medida desde el momento en que el efecto empezó, es decir, desde el valor
  `elapsed` que el host pasa en cada frame.
- El efecto no conserva estado de progreso: es una función pura del buffer
  del frame y de `elapsed`, así que nunca se desvía con el ritmo de frames ni
  con el jitter del tick.
- Garantía de determinismo: una vez que `elapsed >= FADE_DURATION`,
  `Effect::on_frame` vuelve sin escribir una sola celda. Cada frame posterior
  es byte-idéntico al buffer renderizado por el host, mientras el efecto
  siga activo — las llamadas repetidas son estables, y el buffer puede
  compararse celda por celda (el conjunto de tests lo demuestra).

### Testing

El conjunto de pruebas de `xtop-effect-fade` cubre: identidad de bytes al final de la ventana,
atenuación con elapsed cero (las celdas RGB atenuadas, las celdas
`Color::Reset`/indexadas intactas), monotonía estricta en el punto medio del
fundido, metadatos del manifest estables, llamadas repetidas después de la
ventana y buffers vacíos.

## Nota de integración

El kernel (repo `xtop`) cablea los efectos integrados en su pipeline de
renderizado detrás de una feature opcional `effects` (ROADMAP del ecosistema
M5.3, entregado con el hito del kernel): la closure de dibujo aplica el
`on_frame` del efecto activo al buffer después del layout y antes del flush
del terminal, pasando el tiempo transcurrido desde que el efecto empezó.
Hasta que ese cableado aterrice, este repositorio compila y hace test de
forma independiente contra el crate de contrato `xtop-effect-api`; nada de
aquí depende del kernel.
