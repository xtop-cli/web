# Packs de widgets de la comunidad

Este directorio es el hogar reservado para los packs de la comunidad.
Actualmente es un andamiaje vacío: todavía no se ha contribuido ningún pack.

Los packs de la comunidad siguen la misma forma que los integrados
(`registry()` sobre `xtop-widget-api`), y el motor del kernel los integra en
**tiempo de compilación** — no hay carga de packs en tiempo de ejecución:

1. Escribe el crate del pack con un
   `pub fn registry() -> HashMap<&'static str, WidgetRenderer>`; los packs
   que viven aquí se añaden como miembros de este workspace (bajo
   `custom/`).
2. El kernel depende del crate detrás de una feature opcional de Cargo y
   añade una entrada `Pack { name, renderers }` a su lista de precedencia
   (`xtop/src/ui/layout/engine.rs::packs()`).
3. Los usuarios seleccionan el pack con `style.pack` (global) o
   `style.widgets.<name>.pack` (por widget); los nombres ausentes vuelven al
   pack base.

Ver `docs/authoring.md` para el contrato completo de autoría. El
descubrimiento dinámico de packs en tiempo de ejecución se aplaza
deliberadamente (ROADMAP del workspace, §7).
