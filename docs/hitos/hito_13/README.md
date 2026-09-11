# Hito 13: Visor Gráfico Interactivo en HTML Autocontenido con Árbol de Ramas, Aislamiento de Scope y Estética Nativa Git/GitLab

> **Estándar OpenSpec SDD (Spec-Driven Development)**  
> Este documento define la propuesta (*Proposal*) y las especificaciones normativas con escenarios ejecutables (*Delta Specs*) según el estándar [OpenSpec](https://openspec.dev/).

---

## 1. Proposal

### Why
Los diagramas estáticos en Markdown generados en el Hito 12 (`GRAPH.md`) satisfacen la visualización básica y la documentación dentro de repositorios Git en plataformas web (GitHub, GitLab, Azure DevOps). Sin embargo, cuando un repositorio presenta decenas de ramas concurrentes y cientos de commits, los reportes estáticos resultan difíciles de explorar e inspeccionar en profundidad.

Basándonos en las capacidades introducidas en el Hito 12 (reconstrucción genealógica multi-nivel, árbol topológico jerárquico de consola y análisis bilateral rama contra rama), los equipos requieren trasladar esta riqueza analítica a una experiencia web interactiva, moderna y desacoplada:
1. **Visualización Dual y Complementaria:** Poder explorar las ramas tanto en vista cronológica continua commit a commit (*Commit Graph / Timeline* interactivo) como en vista de árbol jerárquico genealógico colapsable (*Branch DAG Tree*), emulando y enriqueciendo el árbol de terminal de Hito 12 en el navegador.
2. **Aislamiento de Ramas en el Scope Impreso:** Permitir al usuario aislar una rama específica y su contexto genealógico inmediato (rama base, padre, hijas directas y commits asociados), y garantizar que al imprimir o exportar a PDF (`@media print`), el alcance impreso quede perfectamente acotado y formateado sin controles de UI innecesarios.
3. **Modo de Solo Relaciones Rama contra Rama:** Ofrecer una modalidad de visualización enfocada exclusivamente en la topología de ramas (relaciones de bifurcación `fork`, fusión `merge` y métricas de sincronización `ahead/behind`), suprimiendo el ruido de commits individuales para auditorías ejecutivas y comparativas bilaterales.
4. **Modo de Verbosidad (Inclusión de Commits No Relevantes):** En auditorías forenses y revisiones de bajo nivel, los desarrolladores necesitan inspeccionar commits que habitualmente se descartan o agrupan en vistas de alto nivel (commits de mantenimiento menores, mensajes sin formato Conventional Commit estricto, chores estructurales y el cuerpo completo `body`). El visor debe ofrecer un control de verbosidad para alternar entre un historial limpio y un historial exhaustivo sin recargar.
5. **Resumen de Cambios en Merges Tipo Git:** En los flujos de integración, los desarrolladores y revisores necesitan saber con precisión qué aportó cada fusión. En lugar de solo marcar la arista o el commit de merge, el visor debe proveer un resumen estructurado al estilo Git (`Merge branch '...' into '...'` con volumen de commits integrados, autores que colaboraron, desglose de tipos y rango de hashes).
6. **Directriz Estética Estricta: Identidad Visual Git / GitLab (Anti-Cards UI):**
   * Queda terminantemente **prohibido el diseño web genérico** basado en "tarjetas sobre tarjetas" (*cards over cards*), sombras difusas flotantes, paddings abultados o plantillas de dashboard comercial desvinculadas de la labor de ingeniería.
   * La interfaz DEBE adoptar una **estética técnica de alta densidad idéntica a GitLab** (*GitLab Repository Network Graph & Commit Log / Pajamas Design System*):
     - Carriles de grafo vectoriales limpios alineados pixel a pixel con las filas del historial de commits.
     - Filas tabulares densas y compactas donde cada píxel entrega información útil (hash monoespaciado, insignia de rama tipo *pill badge*, mensaje con Conventional Commit coloreado, autor y tiempo relativo).
     - Paleta cromática sobria y profesional inspirada en el tema oscuro de GitLab (`#18191d`, bordes técnicos `#28292d`, acentos púrpura/índigo de GitLab `#7b58cf`) y tema claro con contraste nítido.
     - Árbol de ramas con líneas de guía monoespaciadas (`1px solid`) sin marcos de tarjetas pesadas.
7. **Portabilidad Total:** Todo debe funcionar en un archivo HTML único autocontenido, ejecutable con doble clic mediante el protocolo `file:///` sin requerir servidor HTTP local ni conexión a internet (RNF-8).

### What Changes
*   Creación del compilador `src/graph/html.js` para serializar la estructura topológica e inyectarla en una plantilla web autocontenida.
*   Diseño de la plantilla interactiva `templates/graph-viewer.html` con maquetación de alta densidad estilo **GitLab Network Graph**: barra de navegación técnica compacta, selector de vistas (Grafo, Árbol, Solo Relaciones), carril SVG de bifurcaciones integrado al commit-log y panel lateral de inspección técnica.
*   Implementación de dos motores visuales interactivos en cliente:
    - **Lienzo de Grafo (Commit Graph):** Carriles SVG vectoriales idénticos a GitLab/Git, con curvas Bézier suaves para ramas y fusiones, alineados a filas de commits de alta densidad sin contenedores tipo tarjeta.
    - **Árbol Topológico Jerárquico (Branch Tree View):** Nodos compactos de ramas colapsables con guías de nivel tipo árbol de archivos de GitLab, insignias *pill* de estado (`[base]`, `[activa]`, `[fusionada]`, `[divergente]`), conteo de commits y badges de colaboradores.
*   Implementación del selector de modo **"Solo Relaciones Rama contra Rama"** para contraer los commits y exhibir únicamente la topología DAG de ramas.
*   Implementación del motor de **Aislamiento de Scope (Branch Scope Isolation)** para filtrar y enfocar una rama y su entorno genealógico relevante.
*   Diseño de la hoja de estilos de impresión `@media print` y botón interactivo "Imprimir / Exportar Reporte" para generar hojas técnicas limpias del scope aislado.
*   Incorporación del **Modo de Verbosidad** (en CLI mediante `-v, --verbose` y en interfaz con un interruptor *toggle*): permite incluir commits no relevantes (mensajes no convencionales, chores menores, merges internos) y visualizar el cuerpo extenso de los commits.
*   Módulo de **Resumen de Merges Tipo Git**: cálculo e inyección de fichas de síntesis en nodos y aristas de fusión detallando commits absorbidos, autores participantes y desglose por tipos.
*   Soporte de la bandera `-H, --html` en los comandos de generación e integración en el CLI y Wizard.

### Capabilities
#### New Capabilities
*   `interactive-html-report`: Generación del archivo `GRAPH.html` (o ruta personalizada) con visualización interactiva sin servidor.
*   `zero-server-portability`: Apertura directa mediante protocolo local `file:///` en cualquier navegador web moderno sin restricciones de CORS.
*   `gitlab-developer-aesthetic`: Sistema de interfaz de usuario de alta densidad técnica inspirado directamente en GitLab (carriles de grafo, tipografía monoespaciada, pill badges, cero cards genéricas).
*   `dual-visualization-tree-graph`: Selector en cliente para conmutar fluidamente entre la vista de Grafo de Commits (*Commit Graph estilo GitLab*) y la vista de Árbol Jerárquico de Ramas (*Branch DAG Tree*).
*   `branch-scope-isolation`: Aislamiento contextual reactivo de una rama específica junto a su rama base, padre, ramas hijas y commits correspondientes.
*   `branch-to-branch-topology`: Modalidad de visualización y análisis de relaciones puras inter-ramas, suprimiendo los nodos de commits individuales.
*   `print-export-scope`: Optimización de impresión y exportación a PDF (`@media print`) que acota la salida estrictamente al scope y rama aislada.
*   `verbose-commit-inclusion`: Control de verbosidad para alternar entre historial curado (solo commits relevantes) e historial exhaustivo con commits no convencionales y bodies extendidos.
*   `git-style-merge-summary`: Cálculo y presentación de fichas resumen de integración en nodos y uniones de merge estilo Git.
*   `in-browser-controls`: Zoom, paneo, restablecimiento de vista, buscador de colaboradores en vivo y panel de inspección de metadatos.

#### Modified Capabilities
*   `renderer`: Incorporación del renderizado HTML para grafos en `src/renderer.js` y `src/pipeline.js` soportando verbosidad y resúmenes de merge.
*   `cli`: Ampliación de banderas de salida para habilitar la exportación del visor HTML interactivo con `--html` y `-v, --verbose`.

### Impact
*   **Archivos afectados:** `src/graph/html.js`, `templates/graph-viewer.html`, `src/pipeline.js`, `src/renderer.js`, `bin/cli.js`, `src/wizard.js`.
*   **Dependencias:** Cero dependencias de servidor en tiempo de ejecución. Los assets (CSS y JS) se empaquetan en el archivo único generado.

---

## 2. Specifications & Scenarios (Delta Specs)

### Requirement: Autocontención y Funcionamiento Cero-Servidor (RNF-8)
El sistema DEBE (*SHALL*) compilar el visor interactivo en un único archivo HTML autocontenido capaz de abrirse directamente mediante el protocolo `file:///` en cualquier navegador web moderno, sin emitir peticiones de red externas ni arrojar errores de seguridad de políticas de origen (CORS).

#### Scenario: Apertura offline desde explorador de archivos
- **WHEN** el usuario hace doble clic sobre el archivo `GRAPH.html` generado en su explorador de archivos sin conexión a internet
- **THEN** el navegador abre la interfaz gráfica de forma instantánea y carga los datos topológicos sin registrar errores en la consola de herramientas de desarrollo.

---

### Requirement: Estética y Diseño de Alta Densidad Nativo de Git/GitLab (Anti-Cards UI)
El sistema DEBE (*SHALL*) estructurar la interfaz web siguiendo los patrones visuales y de interacción técnica de **GitLab Repository Graph** y Git, prohibiendo explícitamente el uso de tarjetas anidadas (*cards-on-cards*), sombras dispersas o márgenes desmedidos que degraden la densidad de información requerida por desarrolladores.

#### Scenario: Presentación visual con carriles de grafo y filas de commits estilo GitLab
- **WHEN** el usuario abre el visor en cualquier navegador
- **THEN** la pantalla despliega un registro continuo de commits en filas compactas (altura máxima 42px por fila), con carriles de grafo vectoriales (colores GitLab `#6366f1`, `#10b981`, `#f59e0b`, `#ec4899`, `#3b82f6`) a la izquierda, badges de rama tipo *pill* con tipografía monoespaciada y ausencia total de tarjetas rectangulares abultadas.

#### Scenario: Inspección técnica en panel lateral compacto tipo GitLab
- **WHEN** el usuario hace clic sobre cualquier commit o rama
- **THEN** se abre un panel lateral deslizante de alta densidad con fondo plano y bordes técnicos delgados (`1px solid #28292d`), que detalla los metadatos sin cajas decorativas superfluas.

---

### Requirement: Visualización Dual (Grafo de Commits vs Árbol Jerárquico de Ramas)
El sistema DEBE (*SHALL*) proporcionar en la interfaz web controles para alternar en vivo entre la vista de **Grafo de Commits** (*Timeline continuo con bifurcaciones y fusiones*) y la vista de **Árbol Topológico de Ramas** (*Estructura jerárquica colapsable con estado, colaboradores y commits desplegables*).

#### Scenario: Alternancia fluida entre vista de Grafo y vista de Árbol de Ramas
- **WHEN** el usuario visualiza el grafo de commits y pulsa el botón "Vista de Árbol (Tree View)"
- **THEN** la interfaz contrae el lienzo de commits y renderiza la jerarquía genealógica en árbol con ramas padre, ramas hijas, insignias de estado (`[base]`, `[activa]`, `[fusionada]`, `[divergente]`) y nodos colapsables.

---

### Requirement: Modo de Solo Relaciones Rama contra Rama (Topología Pura)
El sistema DEBE (*SHALL*) incluir un conmutador o modo de visualización que oculte los commits individuales y presente de manera exclusiva las relaciones de bifurcación, fusión y sincronización entre ramas.

#### Scenario: Activación del modo de solo relaciones inter-ramas
- **WHEN** el usuario activa la opción "Solo Relaciones de Ramas" en la barra de controles
- **THEN** el visor oculta los nodos de commits individuales y renderiza únicamente los nodos de rama interconectados con flechas dirigidas de bifurcación (`fork`), fusión (`merge`) y métricas de divergencia (`ahead/behind`).

#### Scenario: Comparación bilateral interactiva de rama contra rama
- **WHEN** el usuario selecciona una rama base (ej. `dev`) y una rama objetivo (ej. `feat/wizard-cli`) en el panel de comparación bilateral
- **THEN** el visor muestra de forma exclusiva el subgrafo que conecta ambas ramas, detallando el commit de bifurcación, los commits pendientes y los commits aportados.

---

### Requirement: Modo de Verbosidad e Inclusión de Commits No Relevantes
El sistema DEBE (*SHALL*) soportar un modo de verbosidad (activable mediante bandera `-v, --verbose` o mediante interruptor interactivo en la barra de herramientas del visor) que permita incorporar commits no catalogados como relevantes (commits de mantenimiento, mensajes sin prefijo Conventional Commit, commits auxiliares) y visualizar el cuerpo descriptivo completo (`body`) de cada commit.

#### Scenario: Activación de modo verboso en el visor interactivo
- **WHEN** el usuario activa el interruptor "Modo Verboso (Verbose)" en el visor web
- **THEN** el visor actualiza la lista y los nodos incluyendo los commits secundarios/no convencionales atenuados con etiqueta `[non-conventional]` o `[chore]` y habilita la visualización del cuerpo completo en los detalles.

#### Scenario: Modo estándar sin verbosidad (curaduría limpia)
- **WHEN** el visor opera en modo estándar (por defecto)
- **THEN** se priorizan únicamente los commits semánticos relevantes, reduciendo el ruido visual para facilitar el análisis arquitectónico.

---

### Requirement: Resumen de Cambios en Nodos y Aristas de Merge Tipo Git
El sistema DEBE (*SHALL*) calcular y presentar en los eventos, nodos y aristas de fusión un resumen estructurado estilo Git que detalle: el mensaje de merge (`Merge branch '...' into '...'`), el total de commits absorbidos, los autores contribuyentes y el desglose cuantitativo por tipos de Conventional Commits aportados por la rama integrada.

#### Scenario: Inspección de evento de merge con resumen estilo Git
- **WHEN** el usuario hace clic sobre un commit de merge o sobre la arista de fusión entre dos ramas
- **THEN** el panel lateral y el tooltip despliegan una tarjeta de síntesis de merge estilo Git detallando:
  - Título de la integración y commit destino.
  - Cantidad total de commits integrados (ej. `12 commits aportados`).
  - Lista de autores participantes en dicha rama.
  - Conteo de cambios por tipo (ej. `feat: 5, fix: 4, docs: 3`).
  - Rango de hashes involucrados (`forkPoint..branchTip`).

#### Scenario: Resumen de integración en rama fusionada dentro de la vista de árbol
- **WHEN** el usuario expande una rama con estado `[fusionada]` en la vista de árbol
- **THEN** la cabecera de la rama muestra un bloque destacado "↳ Resumen de Fusión en <rama-destino>" con las métricas de la contribución integrada.

---

### Requirement: Aislamiento de Ramas en Interfaz y Scope Impreso
El sistema DEBE (*SHALL*) permitir aislar el análisis a una rama seleccionada y garantizar que al ejecutar la acción de impresión o guardado como PDF (`@media print`), el alcance impreso quede acotado estrictamente a dicha rama y sus dependencias genealógicas directas.

#### Scenario: Aislamiento dinámico de una rama en el visor web
- **WHEN** el usuario selecciona una rama en el menú de aislamiento de scope o hace doble clic sobre un nodo de rama
- **THEN** el visor atenúa u oculta las ramas ajenas y enfoca exclusivamente la rama seleccionada, su rama padre de origen, sus ramas hijas y la rama destino de fusión.

#### Scenario: Impresión o exportación PDF de una rama aislada con hoja formateada
- **WHEN** el usuario con una rama aislada pulsa el botón "Imprimir / Exportar Reporte" o ejecuta `Ctrl+P`
- **THEN** la hoja de impresión aplica estilos limpios `@media print` que suprimen la barra de navegación, controles de zoom y fondos oscuros, imprimiendo únicamente la ficha topológica de la rama aislada, sus relaciones, su resumen de merge y la tabla de colaboradores asociada.

---

### Requirement: Filtrado Interactivo por Colaborador y Panel de Metadatos
El sistema DEBE (*SHALL*) proveer un buscador/selector de colaboradores para destacar visualmente su actividad, y un panel lateral deslizable con la ficha técnica detallada al seleccionar cualquier nodo.

#### Scenario: Selección y realce reactivo por colaborador
- **WHEN** el usuario selecciona un autor en el selector de colaboradores
- **THEN** el visor resalta con colores destacados las ramas y commits donde dicho autor haya participado, reduciendo la opacidad de los nodos restantes.

#### Scenario: Inspección de metadatos en panel lateral
- **WHEN** el usuario hace clic sobre un commit o rama
- **THEN** el panel lateral se despliega mostrando el hash corto y largo, autor, email, Conventional Commit (tipo, scope, descripción), cuerpo descriptivo, fecha y enlace al repositorio remoto si está configurado.

---

## 3. Detalle de Épica y Diseño Técnico
Para consultar el documento de diseño arquitectónico (**SDD**) y el checklist de tareas de implementación (**Tasks**), acceda a:
*   👉 **[Épica 13: SDD & Implementation Tasks](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_13/epica/README.md)**
