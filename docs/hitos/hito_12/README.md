# Hito 12: Generador de Grafos en Markdown con Mermaid

> **Estándar OpenSpec SDD (Spec-Driven Development)**  
> Este documento define la propuesta (*Proposal*) y las especificaciones normativas con escenarios ejecutables (*Delta Specs*) según el estándar [OpenSpec](https://openspec.dev/).

---

## 1. Proposal

### Why
Los reportes de documentación deben vivir junto al código en el repositorio Git y poder visualizarse de inmediato en GitHub, GitLab, Azure DevOps y visores de Markdown de VS Code sin requerir herramientas o plugins de terceros. Asimismo, los usuarios demandan tanto una vista simplificada de alto nivel (para ver qué ramas existen, cómo se relacionan y quiénes subieron cambios) como una vista detallada commit a commit.

### What Changes
*   Creación del módulo `src/graph/mermaid.js` para compilar la estructura topológica en sintaxis Mermaid nativa (`gitGraph` para vista detallada y diagramas de flujo DAG para vista simplificada).
*   Implementación de la bandera `-s, --simplified` para conmutar entre los dos niveles de granularidad.
*   Diseño de la plantilla Handlebars `templates/graph.hbs` que integra el bloque de diagrama Mermaid y tablas comparativas de colaboradores por rama.
*   Creación del módulo `src/graph/terminal.js` para emitir una previsualización de árbol enriquecida con caracteres Unicode y colores ANSI en ejecuciones `--dry-run` o en consola.
*   Rutinas de sanitización y escape de caracteres conflictivos para asegurar estricta compatibilidad con la gramática de Mermaid (RNF-9).

### Capabilities
#### New Capabilities
*   `mermaid-markdown-graph`: Generación del documento `GRAPH.md` conteniendo diagramas Mermaid renderizables en plataformas web Git.
*   `dual-granularity`: Conmutación entre vista detallada (commits individuales, hashes, autores y mensajes) y vista simplificada (topología pura de ramas y autores atribuidos).
*   `ansi-terminal-tree`: Visualizador de consola para previsualizar el árbol de ramas y colaboradores en la terminal.

#### Modified Capabilities
*   `renderer`: Incorporación del tipo `graph` al motor de renderizado de `src/renderer.js`.

### Impact
*   **Archivos afectados:** `src/renderer.js`, `src/graph/mermaid.js`, `src/graph/terminal.js`, `templates/graph.hbs`.
*   **Dependencias:** Compatible con Markdown estándar y librerías nativas de formateo de terminal (`picocolors`).

---

## 2. Specifications & Scenarios (Delta Specs)

### Requirement: Generación de Diagramas Mermaid Nativos
El sistema DEBE (*SHALL*) generar código de diagrama Mermaid estrictamente válido dentro de un bloque de código cercado ```` ```mermaid ```` en el archivo `GRAPH.md`.

#### Scenario: Generación exitosa de diagrama en formato Markdown
- **WHEN** el usuario ejecuta `tu-doc-cli generate graph` en un repositorio analizado
- **THEN** se crea el archivo `GRAPH.md` conteniendo un bloque `mermaid` con sintaxis válida reconocible por los visores de GitHub y GitLab.

---

### Requirement: Soporte de Doble Granularidad (Detallada vs Simplificada)
El sistema DEBE (*SHALL*) soportar la vista detallada por defecto y alternar a la vista simplificada cuando se especifique la bandera `--simplified`.

#### Scenario: Generación en Modo Simplificado
- **WHEN** el usuario invoca la generación con la opción `--simplified`
- **THEN** el diagrama Mermaid omite los commits individuales y grafica únicamente las relaciones de ramificación y fusión entre ramas, incluyendo los nombres de los colaboradores principales en las etiquetas de cada rama.

#### Scenario: Generación en Modo Detallado
- **WHEN** el usuario genera el grafo sin banderas de simplificación
- **THEN** el diagrama Mermaid incluye nodos de commit individuales con su hash corto, autor y mensaje truncado.

---

### Requirement: Sanitización y Escape de Caracteres Especiales (RNF-9)
El sistema DEBE (*SHALL*) sanitizar y escapar caracteres reservados de Mermaid (tales como comillas dobles, corchetes, paréntesis, signos `#` y barras `/`) en los mensajes de commit, nombres de ramas y nombres de autor.

#### Scenario: Commit con mensaje que incluye comillas y paréntesis
- **WHEN** un commit posee el mensaje `fix(core): "solucionar" problema #45`
- **THEN** el generador escapa las comillas y caracteres especiales para evitar errores sintácticos de renderizado en Mermaid.

---

### Requirement: Tablas de Resumen de Colaboradores por Rama
El sistema DEBE (*SHALL*) anexar tablas de resumen estructuradas en Markdown al pie del diagrama, detallando para cada rama sus colaboradores, cantidad de commits y estado de integración.

#### Scenario: Tabla de atribución de colaboradores
- **WHEN** se genera el documento `GRAPH.md`
- **THEN** el documento final incluye una tabla con columnas: `Rama`, `Estado`, `Colaboradores Principales`, `Commits` y `Tipos de Cambio`.

---

### Requirement: Previsualización de Árbol en Consola Terminal
El sistema DEBE (*SHALL*) imprimir un árbol gráfico estilizado con caracteres Unicode y colores ANSI en la terminal cuando se ejecute con `--dry-run`.

#### Scenario: Ejecución de grafo en simulación dry-run
- **WHEN** el usuario ejecuta `tu-doc-cli graph --dry-run`
- **THEN** el sistema no escribe archivos físicos y emite en consola el árbol de ramas resaltando ramas activas y colaboradores.

---

## 3. Detalle de Épica y Diseño Técnico
Para consultar el documento de diseño arquitectónico (**SDD**) y el checklist de tareas de implementación (**Tasks**), acceda a:
*   👉 **[Épica 12: SDD & Implementation Tasks](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_12/epica/README.md)**
