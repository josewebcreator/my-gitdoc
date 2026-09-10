# Hito 13: Visor Gráfico Interactivo en HTML Autocontenido

> **Estándar OpenSpec SDD (Spec-Driven Development)**  
> Este documento define la propuesta (*Proposal*) y las especificaciones normativas con escenarios ejecutables (*Delta Specs*) según el estándar [OpenSpec](https://openspec.dev/).

---

## 1. Proposal

### Why
Los diagramas estáticos en Markdown satisfacen la visualización básica en plataformas Git, pero resultan difíciles de explorar cuando un repositorio contiene decenas de ramas concurrentes y cientos de commits. Los desarrolladores y líderes técnicos requieren una experiencia dinámica similar a GitLens: explorar el grafo mediante paneo y zoom, alternar interactivamente entre una vista simplificada y detallada, y filtrar por colaborador para aislar el trabajo de un desarrollador. Todo esto debe funcionar en un archivo HTML independiente que pueda abrirse con un doble clic sin necesidad de correr un servidor web local (`file:///`).

### What Changes
*   Creación del compilador `src/graph/html.js` para empaquetar los datos del grafo en un archivo HTML único.
*   Diseño de la plantilla interactiva `templates/graph-viewer.html` con interfaz moderna (tema oscuro/claro, barra de herramientas, panel lateral de detalles y lienzo de renderizado SVG/Canvas).
*   Soporte de la bandera `-H, --html` en el comando del grafo para detonar la generación del visor web.
*   Incrustación de scripts y estilos dentro del bundle para garantizar funcionamiento sin conexión a internet y sin servidor HTTP (RNF-8).

### Capabilities
#### New Capabilities
*   `interactive-html-report`: Generación del archivo `GRAPH.html` (o ruta personalizada) con visualización interactiva.
*   `zero-server-portability`: Apertura directa mediante protocolo `file:///` en cualquier navegador web moderno.
*   `in-browser-controls`: Alternador en vivo de granularidad (simplificada / detallada), zoom, paneo, filtro por autor y panel de inspección de commits.

### Impact
*   **Archivos afectados:** `src/graph/html.js`, `templates/graph-viewer.html`, `bin/cli.js`, `src/pipeline.js`.
*   **Dependencias:** Sin dependencias de servidor en tiempo de ejecución.

---

## 2. Specifications & Scenarios (Delta Specs)

### Requirement: Autocontención y Funcionamiento Cero-Servidor (RNF-8)
El sistema DEBE (*SHALL*) compilar el visor en un único archivo HTML autocontenido capaz de operar plenamente al abrirse directamente desde el sistema de archivos local mediante el protocolo `file:///`, sin requerir un servidor HTTP en segundo plano ni conexión a internet activa.

#### Scenario: Apertura offline desde explorador de archivos
- **WHEN** el usuario hace doble clic sobre el archivo `GRAPH.html` generado sin conexión a internet
- **THEN** el navegador abre la interfaz gráfica de forma inmediata y renderiza el grafo sin advertencias de bloqueo de recursos locales (CORS).

---

### Requirement: Alternador de Granularidad en Cliente
El sistema DEBE (*SHALL*) incluir un control interactivo (*toggle*) en la interfaz del navegador que permita al usuario conmutar en vivo entre la vista **Simplificada** (relaciones de ramas y desarrolladores) y la vista **Detallada** (árbol completo de commits individuales).

#### Scenario: Conmutación a vista simplificada en navegador
- **WHEN** el usuario activa el interruptor "Vista Simplificada" en la barra de herramientas del visor
- **THEN** el lienzo contrae los nodos de commits individuales y renderiza de forma fluida el mapa de bifurcaciones y uniones entre ramas con sus colaboradores asociados.

---

### Requirement: Filtrado Interactivo por Colaborador
El sistema DEBE (*SHALL*) proveer un selector o buscador de autores que permita destacar visualmente las ramas y commits en los que haya participado el desarrollador seleccionado, atenuando el resto del grafo.

#### Scenario: Selección de un colaborador específico
- **WHEN** el usuario selecciona al colaborador "Carlos" en el menú lateral
- **THEN** el grafo resalta en colores brillantes las ramas y commits donde "Carlos" intervino, reduciendo la opacidad de los demás nodos.

---

### Requirement: Panel Lateral de Inspección de Metadatos
El sistema DEBE (*SHALL*) desplegar un panel lateral con los detalles completos del nodo (hash, autor, fecha, Conventional Commit, scope y enlace al repositorio remoto si está configurado) cuando el usuario haga clic sobre un commit o rama.

#### Scenario: Clic sobre un nodo de commit
- **WHEN** el usuario hace clic sobre el commit `8e3de67` en el grafo interactivo
- **THEN** se despliega el panel lateral mostrando el mensaje completo, autor, scope y el hipervínculo hacia la vista remota de GitHub/GitLab.

---

## 3. Detalle de Épica y Diseño Técnico
Para consultar el documento de diseño arquitectónico (**SDD**) y el checklist de tareas de implementación (**Tasks**), acceda a:
*   👉 **[Épica 13: SDD & Implementation Tasks](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_13/epica/README.md)**
