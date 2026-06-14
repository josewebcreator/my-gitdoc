# Épica 6: Configuración y Flexibilidad

Esta épica agrupa las tareas técnicas de soporte para configuración por proyecto, flags de rutas dinámicas de salida, plantillas personalizadas y renderizado de cuerpos de commits en modo verboso.

## **Archivos Involucrados**
*   `bin/cli.js` - Parámetros del CLI.
*   `src/pipeline.js` - Propagación de configuraciones.
*   `src/renderer.js` - Carga de plantillas dinámicas y soporte de verbosidad.

---

## **Tareas de Desarrollo**
*   [x] Modificar la inicialización del CLI para leer y parsear el archivo `.gitdocrc.json` si se encuentra en la raíz del proyecto.
*   [x] Implementar la función de mezcla recursiva `deepMerge` para unificar `config/rules.json` y el `.gitdocrc.json` del usuario.
*   [x] Añadir las opciones de CLI `--output <ruta>`, `--template <ruta>` y `--verbose` en `bin/cli.js`.
*   [x] Actualizar `renderer.js` para usar la ruta del template suministrado si está presente en las opciones de renderizado.
*   [x] Modificar el renderizador y las plantillas predeterminadas de Changelog para inyectar y dar formato al campo `body` si la opción `verbose` está activa.
*   [x] Desarrollar pruebas unitarias en `tests/unit/renderer.test.js` que verifiquen que el `body` aparece en la salida con `--verbose`.

> **Commit:** `feat(cli): implementar hito 6 personalizacion, rutas flexibles y verbosidad`
