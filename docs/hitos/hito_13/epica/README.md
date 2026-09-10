# Épica 13: Software Design Document (SDD) & Tasks - Visor Gráfico HTML

> **Estándar OpenSpec SDD (Spec-Driven Development)**  
> Este documento contiene el Diseño de Software (*Design Document*) y el Desglose de Tareas (*Tasks Checklist*) del Hito 13 conforme a las directrices de [OpenSpec](https://openspec.dev/).

---

## 1. Software Design Document (SDD)

### Context
La inspección visual de topología Git en equipos de software a menudo depende de extensiones de IDE (como GitLens) o interfaces web completas. Para compartir el análisis con partes interesadas que no usan el mismo editor, o para archivarlo en auditorías técnicas y pipelines de CI/CD, se requiere un visor web interactivo desacoplado en un archivo HTML independiente.

### Goals / Non-Goals
*   **Goals:**
    *   Generar un único archivo `.html` autocontenido (*single-file bundle*).
    *   Cero dependencias de servidor local: debe abrirse con doble clic (`file:///`).
    *   Soportar zoom fluido, paneo y selección de ramas mediante canvas o SVG dinámico.
    *   Permitir alternar en vivo entre vista simplificada y detallada sin recargar la página.
    *   Incluir búsqueda y filtrado interactivo por colaborador.
*   **Non-Goals:**
    *   No se creará una aplicación web de servidor con base de datos en tiempo real.
    *   No se permitirá editar ni realizar operaciones de Git write (push, rebase) desde el visor (es un reporte de inspección y auditoría de sólo lectura).

### Decisions & Rationale
1. **Incrustación de Datos JSON Directamente en el HTML:**
   * *Decisión:* Serializar la estructura del grafo topológico en una etiqueta `<script id="gitdoc-data" type="application/json">` dentro del HTML generado.
   * *Razón:* Al abrir el archivo mediante el protocolo `file:///`, las políticas de seguridad del navegador bloquean llamadas `fetch()` a archivos locales externos por restricciones CORS. Incrustar los datos en el propio DOM elimina por completo los bloqueos CORS.

2. **Librería Gráfica Embebida vs Motor SVG Puro:**
   * *Decisión:* Utilizar un motor de renderizado SVG/Canvas declarativo y ligero embebido o inyectado directamente en el bundle.
   * *Razón:* Garantiza rendimiento fluido a 60 FPS en operaciones de zoom y paneo para grafos con cientos de nodos.

### Risks & Trade-offs
*   **[Tamaño del Archivo HTML en Repositorios Enormes]** $\rightarrow$ **Mitigación:** Minificar los metadatos serializados y truncar descripciones excesivamente largas del body de los commits no relevantes para la vista de grafo.
*   **[Bloqueo de Scripts por Políticas Estrictas de Seguridad]** $\rightarrow$ **Mitigación:** No utilizar `eval()` ni llamadas a orígenes de red externos no confiables.

### Migration Plan
*   La generación HTML se activa de forma explícita mediante la bandera `--html` (o `-H`), manteniendo el archivo Markdown `GRAPH.md` como formato predeterminado si no se especifica.

---

## 2. Tasks & Implementation Checklist

### 1. Plantilla y Diseño del Visor (`templates/graph-viewer.html`)
- [ ] 1.1 Diseñar layout responsivo con barra de navegación superior, lienzo central y panel lateral desplegable.
- [ ] 1.2 Implementar sistema de temas visuales (tema oscuro por defecto con paleta moderna y tema claro).
- [ ] 1.3 Incorporar controles de zoom (+ / - / restablecer) y botón de centrado automático de pantalla.

### 2. Motor Gráfico e Interactividad en Cliente
- [ ] 2.1 Implementar la capa de visualización de grafo (nodos de commit, nodos de rama y curvas Bézier para bifurcaciones y merges).
- [ ] 2.2 Programar la lógica del interruptor (*toggle switch*) para alternar entre vista simplificada (ramas) y detallada (commits).
- [ ] 2.3 Desarrollar el buscador reactivo de colaboradores con realce visual de nodos y ramas correspondientes.
- [ ] 2.4 Programar el panel de detalles para desplegar metadatos al seleccionar un commit o rama.

### 3. Compilador de Bundle HTML (`src/graph/html.js`)
- [ ] 3.1 Crear la función `generateHtmlReport(topologyData, options)` que serializa los datos y los inyecta en la plantilla.
- [ ] 3.2 Inyectar la URL remota del repositorio si está configurada para autolinkear hashes e incidencias.
- [ ] 3.3 Soporte de internacionalización para las etiquetas y controles del visor web.

### 4. Pruebas y Validación
- [ ] 4.1 Crear `tests/unit/html-viewer.test.js` verificando que el archivo HTML se genere con sintaxis válida y sin enlaces rotos.
- [ ] 4.2 Validar apertura directa con protocolo `file:///` confirmando la ausencia de errores CORS en la consola del navegador.
