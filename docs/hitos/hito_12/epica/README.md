# Épica 12: Software Design Document (SDD) & Tasks - Grafos en Markdown

> **Estándar OpenSpec SDD (Spec-Driven Development)**  
> Este documento contiene el Diseño de Software (*Design Document*) y el Desglose de Tareas (*Tasks Checklist*) del Hito 12 conforme a las directrices de [OpenSpec](https://openspec.dev/).

---

## 1. Software Design Document (SDD)

### Context
Una vez construida la estructura topológica en memoria (Hito 11), es necesario transformarla en especificaciones visuales interoperables en formato Markdown. Mermaid.js es el estándar de facto soportado nativamente por las principales plataformas de desarrollo colaborativo (GitHub, GitLab, Obsidian, Azure DevOps).

### Goals / Non-Goals
*   **Goals:**
    *   Generar sintaxis Mermaid nativa (`gitGraph` o `flowchart LR`) con 100% de validez sintáctica.
    *   Implementar dos variantes visuales: vista simplificada (DAG de ramas y colaboradores) y vista detallada (commits individuales).
    *   Generar tablas de Markdown limpias con las métricas de colaboradores por rama.
    *   Proveer previsualización en consola con caracteres Unicode (`├─`, `└─`, `│`).
*   **Non-Goals:**
    *   No se empaquetarán imágenes binarias PNG o JPEG en el reporte Markdown (se mantiene texto plano interoperable).

### Decisions & Rationale
1. **Doble Sintaxis Mermaid según Nivel de Granularidad:**
   * *Decisión:* Emplear `gitGraph` para el modo detallado y `flowchart LR` / `graph TD` para el modo simplificado.
   * *Razón:* La directiva nativa `gitGraph` de Mermaid es óptima para graficar commits cronológicos (`commit id: "..."`), pero carece de flexibilidad para resumir ramas completas con metadatos agregados de autores. Los diagramas de flujo permiten representar nodos de ramas rectangulares con insignias de colaboradores y flechas de bifurcación/merge de forma limpia y legible.

2. **Sanitización Agresiva de Nombres de Rama y Mensajes:**
   * *Decisión:* Sustituir caracteres conflictivos por entidades seguras o comillas tipográficas en las cadenas inyectadas en Mermaid.
   * *Razón:* Un solo carácter no escapado en Mermaid (como una comilla simple o corchete en el subject del commit) provoca que GitHub rechace el bloque completo mostrando un mensaje de error rojo.

### Risks & Trade-offs
*   **[Límites de Nodos en Renderizadores Web de Mermaid]** $\rightarrow$ **Mitigación:** Mermaid impone un límite por defecto de 500 elementos en algunos visores. El modo simplificado se recomienda y promociona automáticamente si el número total de commits supera los 150.
*   **[Nombres de Rama con Caracteres Reservados (`feature/auth#2`)]** $\rightarrow$ **Mitigación:** Generar IDs de nodo alfanuméricos seguros (ej. `branch_1`, `branch_2`) y utilizar la etiqueta visual entre comillas dobles sanitizadas.

### Migration Plan
*   `renderDocument()` en `src/renderer.js` incorporará el caso `tipo === 'graph'` de forma aditiva, sin afectar los flujos preexistentes de `changelog` y `pap`.

---

## 2. Tasks & Implementation Checklist

### 1. Compilador de Sintaxis Mermaid (`src/graph/mermaid.js`)
- [ ] 1.1 Implementar función `buildDetailedGitGraph(topologyData)` usando sintaxis `gitGraph`.
- [ ] 1.2 Implementar función `buildSimplifiedFlowchart(topologyData)` usando sintaxis `flowchart LR` con colaboradores por rama.
- [ ] 1.3 Desarrollar función de sanitización y escape seguro de caracteres para etiquetas y mensajes.
- [ ] 1.4 Generar tablas Markdown de resumen de colaboradores ordenadas por volumen de commits.

### 2. Plantilla y Renderizador (`templates/graph.hbs` y `src/renderer.js`)
- [ ] 2.1 Crear plantilla Handlebars `templates/graph.hbs` con soporte de internacionalización para títulos y encabezados de tabla.
- [ ] 2.2 Integrar el tipo `graph` en `renderDocument()` en `src/renderer.js` admitiendo la opción `simplified: boolean`.
- [ ] 2.3 Conectar autolinking remoto (`generateRemoteLinks`) para que los hashes de las tablas enlacen al repositorio web.

### 3. Previsualizador de Terminal (`src/graph/terminal.js`)
- [ ] 3.1 Implementar formateador de árbol en consola usando caracteres Unicode tipo `tree`.
- [ ] 3.2 Aplicar colores con `picocolors` para distinguir ramas activas (verde), fusionadas (cian) y divergentes (amarillo).
- [ ] 3.3 Mostrar autores y conteo de commits entre paréntesis junto a cada rama.

### 4. Pruebas Unitarias
- [ ] 4.1 Crear `tests/unit/mermaid.test.js` verificando que la sintaxis generada no contenga caracteres inválidos.
- [ ] 4.2 Probar escenarios con nombres de ramas complejos (barras, guiones, tildes y comillas).
- [ ] 4.3 Validar que `--simplified` genere diagramas legibles y compactos.
