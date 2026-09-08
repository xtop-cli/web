# Reglas heurísticas de Samurai

El analizador de Samurai ejecuta las diez reglas siguientes sobre la tabla de
procesos en vivo y conserva hasta **50 alertas** por ejecución
(`MAX_ALERTS`, truncadas al final del pase). Cada regla devuelve como máximo
una alerta por proceso y por ejecución; las reglas se evalúan para cada
proceso en orden de prioridad, por lo que un mismo proceso puede producir
varias alertas. Severidades: **Crítica**, **Advertencia**, **Informativa**.

Las alertas persisten entre ejecuciones: un nuevo análisis reemplaza toda la
lista de alertas, por lo que `process.alerts` / `alerts.status` reflejan la
**última ejecución completada** (las ejecuciones ocurren cada quinto tick;
consulta [architecture.md](architecture.md)).

Todo el emparejamiento de patrones es una simple **contención de subcadena /
regex** sobre el campo buscado: no hay envoltura con barras ni anclaje a la
cadena completa. Los umbrales listados son las constantes exactas de
`src/lib.rs`.

---

## Regla 1 — Ruta de ejecutable sospechosa (`suspicious_exe_path`)

- **Disparador**: `exe_path` comienza con uno de estos prefijos:
  `/tmp/`, `/dev/shm/`, `/var/tmp/`, `/proc/`, `/private/tmp/`,
  `/private/var/tmp/`.
- **Severidad**: Crítica.
- **Ajustes**: lista blanca de prefijos `SUSPICIOUS_PATH_PREFIXES`.

## Regla 2 — Proceso huérfano (`orphan_process`)

- **Disparador**: `parent_pid == 1` y el nombre del proceso en minúsculas
  **no** contiene ninguno de los nombres de demonio permitidos: `systemd`,
  `init`, `launchd`, `sshd`, `login`, `getty`, `nginx`, `apache2`, `httpd`,
  `bash`, `sh`, `zsh`, `tmux`, `screen`.
- **Severidad**: Crítica cuando `run_time < 60` segundos; si no,
  Advertencia.
- **Ajustes**: lista blanca `ALLOWED_ORPHANS`; el corte de severidad de 60 s
  es un literal de la regla.

## Regla 3 — Suplantación (`process_masquerading`)

Dos comprobaciones independientes:

1. El nombre es un proceso de sistema conocido (`svchost`, `lsass`,
   `launchd`, `sshd`, `systemd`, `init`), pero `exe_path` **no** está bajo
   `/usr/`, `/bin/`, `/sbin/` o `/System/` → **Crítica**.
2. En caso contrario, el nombre difiere de la raíz del nombre de archivo
   (file stem) de `exe_path` (sin distinguir mayúsculas) y ninguna de las
   dos cadenas contiene a la otra; p. ej., `name "kitt"` con
   `exe "/opt/vendor/pwn"` → **Advertencia**. Se permiten alias habituales
   como `python3` frente a `/usr/bin/python3.11` (la ruta del exe contiene
   el nombre).

## Regla 4 — Escalada de privilegios (`privilege_escalation`)

- **Disparador**: `effective_user_id != user_id` (ambos presentes).
- **Omite**: binarios SUID conocidos: `/usr/bin/sudo`, `/usr/bin/passwd`,
  `/bin/ping`, `/usr/bin/ping`, `/bin/su`, `/usr/bin/su`, `/usr/bin/newgrp`,
  `/usr/bin/gpasswd`, `/usr/bin/chsh`, `/usr/bin/chfn`, `/usr/bin/mount`,
  `/usr/bin/umount`.
- **Severidad**: Crítica cuando `euid == "0"` (escalada a root); si no,
  Advertencia.

## Regla 5 — Hijo sospechoso de navegador (`suspicious_child_of_browser`)

- **Disparador**: el proceso padre (resuelto a través del mapa de PIDs de la
  instantánea) es un navegador — el nombre contiene `chrome`, `firefox`,
  `safari`, `edge`, `brave`, `opera` o `chromium` — y el nombre del hijo no
  contiene ninguna de las palabras de helper/sandbox esperadas: `helper`,
  `plugin_container`, `plugin_host`, `gpu_process`, `renderer`, `utility`,
  `crashpad`, `updater`.
- **Severidad**: Advertencia.

## Regla 6 — Nombre o comando de amenaza conocido (`known_threat_pattern`)

- **Disparador**:
  - el nombre (en minúsculas) contiene un nombre de minero/rootkit conocido:
    `minerd`, `cpu_miner`, `xmrig`, `kdevtmpfsi`, `kinsing`, `diagree`,
    `watchbog`, `sysguard`, `crond64`, `mkfile`, `sysupdate`, `xmrig-nvidia`,
    `xmrig-amd`, `moneroocean`; o
  - la línea de comandos unida coincide con una de las regex de comando
    compiladas: los flags de minero `--donate-level`, `--max-cpu-usage`,
    `--threads`, y los hosts de pool `pool.monero`, `pool.supportxmr`,
    `mine.monero`.
- **Severidad**: Crítica.
- **Ajustes**: lista blanca de nombres `KNOWN_THREAT_NAMES`; los patrones de
  comando `KNOWN_THREAT_CMDS` se compilan una vez por pase de análisis.

## Regla 7 — Línea de comandos con pipe / descarga (`suspicious_pipe_or_download`)

- **Disparador**: la línea de comandos unida coincide con cualquiera de los
  patrones compilados:
  - `curl … | sh` / `| bash` / `| zsh` (y el equivalente con `wget`),
  - un comando curl que termina con una palabra `bash`/`sh` suelta,
  - `python3 -c` con `import`/`urllib`/`requests`/`socket`,
  - `base64 -d |`,
  - `eval $(curl …)` / `eval $(wget …)` y `bash -c … $(curl|wget)`.
- **Severidad**: Crítica.
- **Ajustes**: lista de patrones `PIPE_PATTERNS` (compilados una vez por
  pase).

## Regla 8 — Recuento alto de hilos (`high_thread_anomaly`)

- **Disparador**: `thread_count >= 500` y el nombre no está en la lista
  blanca: `chrome`, `firefox`, `code`, `Code`, `idea`, `java`, `dotnet`,
  `python`, `node`, `mysqld`, `postgres`, `Xorg`, `dockerd`.
- **Severidad**: Crítica cuando `thread_count > 1000` o `cpu_usage > 200.0`;
  si no, Advertencia.

## Regla 9 — Recuento alto de descriptores de archivo (`suspicious_fd_anomaly`)

- **Disparador**: `open_files >= 1000` y el nombre no está en la lista
  blanca: `mysql`, `postgres`, `nginx`, `httpd`, `apache`, `chrome`,
  `firefox`, `code`, `java`, `dotnet`, `dockerd`.
- **Severidad**: Informativa.

## Regla 10 — Spawn storm (`recent_spawn_storm`)

- **Disparador**: más de **5 PIDs nuevos distintos** del mismo nombre de
  proceso dentro de una ventana móvil de **120 segundos**. Nuevo significa
  `run_time <= 120`; la ventana es `now − start_time < 120` (segundos de
  época). El mismo PID visto de nuevo en ejecuciones posteriores se cuenta
  una sola vez (`spawn_history` indexado por nombre).
- **Severidad**: Advertencia; el mensaje informa de cuántas instancias
  nuevas se vieron dentro de la ventana.
- **Ajustes**: la ventana (120 s), el umbral (> 5) y la comprobación de
  novedad son literales en `rule_spawn_storm`; el historial vive por plugin
  entre ejecuciones.
