# Épica 4: Agrupación, Renderizado y Generación de Reportes

Esta épica coordina las tareas técnicas de filtrado por lógica de negocio, estructurado de datos, inyección en plantillas Handlebars y control de escritura en disco.

## **Archivos Involucrados**
*   [src/renderer.js](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/src/renderer.js) - Motor de inyección de plantillas y ordenamiento.
*   [templates/changelog.hbs](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/templates/changelog.hbs) - Plantilla del CHANGELOG.
*   [templates/pap.hbs](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/templates/pap.hbs) - Plantilla del PAP.

---

## **Tareas de Desarrollo**
*   [ ] Escribir la lógica de carga asíncrona de archivos de plantilla `.hbs` desde el directorio `templates/`.
*   [ ] Implementar los agrupadores lógicos en [renderer.js](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/src/renderer.js):
    *   Para **Changelog**: Clasificar en secciones basadas en tipo (ej. "Nuevas Características" para `feat`) y aislar los commits disruptivos (`BREAKING CHANGE`) a una sección prominente.
    *   Para **PAP**: Filtrar y organizar por la propiedad `scope` (módulo).
*   [ ] Integrar la librería `handlebars` para compilar e inyectar las colecciones de datos resultantes en los templates.
*   [ ] Añadir soporte para el flag de filtrado `--scope` en el pipeline del CLI.
*   [ ] Implementar el control de salida en la acción de [cli.js](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/bin/cli.js):
    *   Modo normal: Guardar el string compilado en `CHANGELOG.md` o `PAP.md` según corresponda.
    *   Modo `--dry-run`: Imprimir directamente el Markdown resultante en la consola y mostrar un aviso de simulación en color amarillo.
