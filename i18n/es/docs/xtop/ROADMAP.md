# Roadmap de Xtop

Este documento describe el roadmap de desarrollo de **xtop**, un monitor de sistema TUI moderno y multiplataforma.
Se sincroniza automáticamente con las Issues de GitHub.

## Fase 1: Funcionalidades principales <!-- phase:core -->

- [x] Estructura TUI básica con `ratatui` y `crossterm` (#1)
- [x] Recopilación de información del sistema con `sysinfo` (#2)
- [x] Uso de CPU por núcleo y detección de la temperatura máxima (#3)
- [x] Monitorización de Memoria y Swap con gráficos históricos (#4)
- [x] Seguimiento de subida y descarga de red (#5)
- [x] Visualización del uso de almacenamiento (#6)
- [x] Lista de los 50 procesos principales ordenados por uso de CPU (#7)
- [x] Compatibilidad multiplataforma (macOS, Linux, Windows) (#8)

## Fase 2: Interfaz y temas <!-- phase:ui-themes -->

- [x] Gestor de layouts dinámico que soporta varios modos (Dashboard, Vertical, Process Focus) (#9)
- [x] Implementar 13 esquemas de color integrados (`x`, `madrid`, `tokio`, etc.) (#10)
      (hoy se distribuyen 12 ficheros de tema, todos incrustados y sembrados; los docs
      cuentan 12. Ver docs/colors.md para la referencia de paletas.)
- [x] Cambio instantáneo de tema y layout en tiempo de ejecución (#11)
- [x] Diseño adaptativo para terminales estrechas (#12)

## Fase 3: Despliegue y distribución <!-- phase:deployment -->

- [x] Scripts automatizados de instalación/desinstalación para Linux y macOS (`install.sh`, `uninstall.sh`) (#13)
- [x] Scripts automatizados de instalación/desinstalación para Windows (`install.ps1`, `uninstall.ps1`) (#14)
- [x] Comandos rápidos de instalación con curl/wget (#15)
- [ ] Pipeline CI/CD para releases binarias multiplataforma automatizadas (#16)
- [ ] Paquetes de distribución (AUR, Homebrew, Winget, APT) (#17)

## Fase 4: Configuración y personalización <!-- phase:config -->

- [x] Soporte de fichero de configuración persistente (guarda las preferencias de tema y layout) (#18)
- [x] Creación de temas de usuario personalizados mediante configuración (#19)
- [x] Intervalos de actualización configurables para las métricas del sistema (#20)
- [x] Keybindings personalizables (#21)

## Fase 5: Funcionalidades avanzadas de monitorización <!-- phase:advanced-monitoring -->

- [x] Seguimiento de la velocidad de lectura/escritura de E/S de disco (#22)
- [ ] Selección granular de interfaces de red (#23) — los datos RX/TX por interfaz se (#39)
      muestran, pero elegir qué interfaz reporta/dibuja el kernel aún no es
      configurable.
- [ ] Monitorización de uso, temperatura y VRAM de la GPU (NVIDIA/AMD) (#24) — (#40)
      NVIDIA mediante nvidia-smi en cualquier plataforma (Linux/macOS/Windows); AMD/Intel
      sigue siendo parcial solo en Linux (/sys/class/drm); macOS/Windows conservan el
      estado vacío honesto para AMD/Intel (sin API pública de utilización).
- [ ] Monitorización del estado de la batería (#25) — Linux sondea real (/sys/class/ (#41)
      power_supply); macOS real (pmset); Windows real con batería agregada
      (GetSystemPowerStatus; por batería vía SetupAPI pendiente); las plataformas
      sin soporte se quedan vacías.
- [ ] Integración del uso de recursos de contenedores Docker (#26) — el soporte Docker se (#42)
      eliminó del modelo de datos compartido (api M1.4: nada lo consumía), así que
      este elemento queda aparcado hasta que aparezca un consumidor real.

## Fase 6: Gestión interactiva de procesos <!-- phase:process-management -->

- [x] Terminación interactiva de procesos (envío de señales de kill) (#27)
- [ ] Buscar, filtrar y resaltar procesos por nombre (#28) — la búsqueda y el (#43)
      filtrado existen; el resaltado de coincidencias dentro de la lista de procesos
      está pendiente.
- [ ] Vista de árbol para la jerarquía de procesos (#29)
- [ ] Ordenar procesos por Memoria, PID o Usuario (#30) — la ordenación por (#44)
      CPU/Memoria/PID/Nombre está implementada; aún no hay columna de Usuario.

## Fase 7: Integración con X <!-- phase:x-integration -->

- [ ] Integración con X (#31)
- [ ] Crear el paquete xp (#32)
- [ ] Añadir a los repositorios de X (#33)

## Fase 8: Refactor del kernel <!-- phase:refactor -->

Línea base hecha: kernel de crate único (src/ por áreas: config, theme,
state, plugins, providers, ui, commands); hosts de plugins y extensiones sobre
los contratos de api; samurai y la extensión mcp viven en sus propios repos.
Aquí solo se lista el trabajo de refactor pendiente (la logística de git se
gestiona fuera de este roadmap).

### R2 - Pasada de calidad de código

- [x] Auditoría de comentarios doc de módulos en todo src/ (#40) — los siete módulos (#45)
      de nivel superior declarados en src/main.rs (commands, config, plugins, providers,
      state, theme, ui) llevan todos docs `//!` concisos que describen su área.
- [x] cfg(target_os) solo dentro de los árboles platform/ (#41) — aplicado por (#46)
      scripts/audit.sh (0 ocurrencias fuera de platform/).
- [ ] Revisión de re-exportaciones comodín y de higiene de pub (#42) — quedan 22 (#47)
      re-exportaciones `pub use ...::*` comodín (umbral de audit.sh: 30); la revisión
      sigue abierta.
- [x] Dividir commands/plugins.rs en módulos list/install/scaffold (#43)
- [x] key_event_to_str a un módulo de entrada compartido si se reutiliza en otro sitio (#44) — (#48)
      un único punto de uso (commands/run.rs), así que no se necesita módulo compartido.
- [x] ui/share/error.rs solo cuando aparezca manejo real de errores de UI (sin módulos (#49)
      vacíos) (#45) — no se creó a propósito; documentado en la lista diferida del
      ROADMAP raíz.
- [x] Los widgets se subdividen internamente cuando superan un módulo (#46) — (#50)
      los renderers de widgets del kernel se externalizaron al repo widgets (M3);
      el kernel ya no es dueño de los widgets de los packs.

### R3 - Herramientas de auditoría estructural

- [x] scripts/audit.sh con umbrales de fallo (#47) — el script bloquea: (#51)
      cfg(target_os) fuera de los árboles platform/ = 0, ficheros de más de 600 líneas = 0,
      marcadores TODO/FIXME/XXX/HACK = 0, `pub use ...::*` comodín <= 30,
      LOC por área de nivel superior <= 2400, árbol de plugins muerto pre-monocrate ausente
      (su ruta vive solo dentro del script de auditoría como la propia guarda),
      `miami` incrustado en las semillas de temas (12 temas en total). El grafo de
      dependencias/ciclos de módulos y la detección de pub sin usar NO están
      implementados por el script (ver la nota diferida abajo).

Seguimientos diferidos (rastreados con la lista del ROADMAP raíz §7):
- grafo de dependencias/ciclos de módulos de audit.sh y detección de pub sin usar, además de
  umbrales por fichero por encima de 300/600 líneas (la cifra de 200 líneas de la
  issue original es anterior a los umbrales actuales de 300/600).
