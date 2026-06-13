# Épica 4: Agrupación, Renderizado y Generación de Reportes

Esta épica coordina las tareas técnicas de filtrado por lógica de negocio, estructurado de datos, inyección en plantillas Handlebars y control de escritura en disco.

## **Archivos Involucrados**
*   [src/renderer.js](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/src/renderer.js) - Motor de inyección de plantillas y ordenamiento.
*   [templates/changelog.hbs](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/templates/changelog.hbs) - Plantilla del CHANGELOG.
*   [templates/pap.hbs](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/templates/pap.hbs) - Plantilla del PAP.

---

## **Tareas de Desarrollo**
*   [x] Escribir la lógica de carga asíncrona de archivos de plantilla `.hbs` desde el directorio `templates/` → `loadTemplate()` en [renderer.js](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/src/renderer.js).
*   [x] Implementar los agrupadores lógicos en [renderer.js](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/src/renderer.js):
    *   Para **Changelog**: `groupForChangelog()` — clasifica `feat|fix|perf|refactor` en secciones en español y aisla `BREAKING CHANGE` en sección destacada.
    *   Para **PAP**: `groupForPap()` — filtra `ci|build` y scopes infra (`db`, `infra`, `docker`, `config`), organiza por scope.
*   [x] Integrar la librería `handlebars` para compilar e inyectar las colecciones de datos resultantes en los templates → `renderDocument()`.
*   [x] Añadir soporte para el flag de filtrado `--scope` en el pipeline del CLI → `scopeFilter` propagado hasta `renderDocument`.
*   [x] Implementar el control de salida en la acción de [cli.js](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/bin/cli.js):
    *   Modo normal: Escribe `CHANGELOG.md` o `PAP.md` en el directorio de trabajo con aviso verde.
    *   Modo `--dry-run`: Imprime el Markdown resultante en stdout con aviso amarillo `⚠ Modo simulación`.
*   [x] Suite de tests — 13 tests unitarios en `tests/unit/renderer.test.js` y 3 tests de integración actualizados. **36/36 pasan.**

> **Commit:** `feat(renderer): implement grouping, Handlebars rendering and file output` (a073a7b)
