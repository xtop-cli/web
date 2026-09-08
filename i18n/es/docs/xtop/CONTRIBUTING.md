# Contribuir a xtop

En primer lugar, gracias por considerar contribuir a `xtop`. Personas como tú hacen que esta herramienta sea mejor.

## ¿Cómo puedo contribuir?

### Informar de errores
- Comprueba que el error no se haya informado ya buscándolo en GitHub en [Issues](https://github.com/xtop-cli/xtop/issues).
- Si no encuentras una issue abierta que aborde el problema, abre una nueva. Asegúrate de incluir un título y una descripción clara, tanta información relevante como sea posible y un ejemplo de código o un caso de prueba ejecutable que demuestre el comportamiento esperado que no se produce.

### Sugerir mejoras
- Abre una issue nueva con la etiqueta `enhancement`.
- Proporciona una explicación clara y detallada de la funcionalidad que quieres y de por qué es importante.

### Pull requests
1. Haz un fork del repositorio y crea tu rama desde `main`.
2. Asegúrate de tener instaladas las dependencias necesarias (Rust y Cargo).
3. Haz tus cambios y pruébalos localmente con `cargo run`.
4. Ejecuta `cargo fmt` y `cargo clippy` para garantizar la calidad y el formato del código.
5. Crea una pull request. Asegúrate de que la descripción de la PR describa con claridad el problema y la solución. Incluye el número de issue relevante si procede.

## Configuración de desarrollo

```bash
# Clone the repository
git clone https://github.com/xtop-cli/xtop.git
cd xtop

# Build the project
cargo build

# Run the project
cargo run

# Run tests (if applicable)
cargo test
```

## Comunidad

Si tienes preguntas o necesitas ayuda, no dudes en ponerte en contacto a través de las issues o discusiones de GitHub (si están habilitadas).
