# Épica 13: Software Design Document (SDD) & Tasks - Visor Gráfico HTML con Árbol, Aislamiento de Scope y Estética Nativa Git/GitLab

> **Estándar OpenSpec SDD (Spec-Driven Development)**  
> Este documento contiene el Diseño de Software (*Design Document*) y el Desglose de Tareas (*Tasks Checklist*) del Hito 13 conforme a las directrices de [OpenSpec](https://openspec.dev/).

---

## 1. Software Design Document (SDD)

### Context
En los Hitos 11 y 12 se consolidó el motor topológico de Git en memoria: reconstrucción genealógica multi-nivel (`parentBranch`, `mergedInto`, `children`, `mergedChildren`), generación de diagramas Mermaid (`gitGraph` y `flowchart LR`), visualizador de árbol Unicode en consola (`src/graph/terminal.js`) y análisis bilateral de rama contra rama (`--base dev --branch feat/xyz`).

El Hito 13 traslada este poder analítico a una aplicación web autocontenida en un único archivo HTML (`GRAPH.html`). Para diferenciarse radicalmente de maquetas web genéricas (paneles de tarjetas sobre tarjetas o plantillas comerciales), el visor debe encarnar **la estética técnica y austera de las herramientas nativas de Git y GitLab**:
1. **Experiencia dual:** Ver el grafo como línea temporal commit a commit (*Commit Graph* integrado a filas de commit estilo GitLab), pero también como **árbol jerárquico interactivo de ramas** (*Branch Tree*).
2. **Estética Nativa Git/GitLab (Anti-Cards):** Prohibir el uso de tarjetas anidadas y sombras decorativas; adoptar filas de registro compactas (36–40px), carriles vectoriales limpios, fuentes monoespaciadas técnicas e insignias *pill*.
3. **Aislamiento de ramas:** Capacidad de aislar ramas en la interfaz y en el **scope impreso** (`@media print`), permitiendo a líderes técnicos emitir reportes limpios en PDF centrados en una rama particular.
4. **Modo de solo relaciones:** Opciones de **solo visualizar/imprimir relaciones de rama contra rama**, reduciendo el ruido de commits y permitiendo contrastar ramas bilateralmente.
5. **Modo de verbosidad:** Capacidad de conmutar en vivo hacia un historial exhaustivo que incorpore **commits no relevantes** (mensajes no convencionales, chores menores, merges intermedios) y el cuerpo completo (`body`).
6. **Resumen de cambios en merges tipo Git:** Fichas de síntesis estructuradas estilo Git en cada unión o merge commit para auditar con exactitud qué cambios aportó cada rama al integrarse.

### Goals / Non-Goals

*   **Goals:**
    *   Generar un único archivo `.html` autocontenido (*single-file bundle*) operable sin conexión a internet ni servidor web (`file:///`).
    *   **Estética Técnica Git/GitLab (Pajamas Design System):**
        *   Prohibir tarjetas abultadas (*anti-cards*); emplear tablas compactas de historial continuo con carriles vectoriales a la izquierda.
        *   Tipografía monoespaciada para hashes, referencias, ramas y scopes (`JetBrains Mono`, `Fira Code`, `ui-monospace`, `Consolas`).
        *   Insignias de rama tipo *pill badge* (`gl-badge`: esquinas redondeadas, borde sutil de 1px, fondo tintado tenue).
        *   Paleta de alta fidelidad: Tema oscuro GitLab (`#18191d`, bordes `#28292d`, acento `#7b58cf`) y tema claro técnico.
    *   **Motor Dual de Visualización:**
        *   *Vista Grafo (Commit Graph):* Visualización en carriles vectoriales SVG alineados pixel a pixel con el registro de commits.
        *   *Vista Árbol (Branch Tree View):* Estructura jerárquica colapsable/expandible DOM de ramas con guías de nivel (`1px solid var(--border)`), insignias de estado, colaboradores y commits desplegables.
    *   **Modo de Solo Relaciones Rama contra Rama:** Omitir commits individuales y exhibir exclusivamente la topología pura de ramas (`fork`, `merge`, métricas `ahead/behind`).
    *   **Aislamiento de Scope:** Filtrar reactivamente una rama y su entorno genealógico relevante (padre, base, hijas, destino de merge).
    *   **Motor de Impresión Optimizado (`@media print`):** Formatear el reporte para impresión o exportación a PDF, acotado estrictamente al scope aislado y libre de controles flotantes.
    *   **Modo de Verbosidad:** Permitir incluir commits no relevantes, merges internos y descripciones completas mediante la bandera `-v, --verbose` o el interruptor de verbosidad en cliente.
    *   **Resúmenes de Merge Tipo Git:** Sintetizar en las uniones de ramas el total de commits aportados, autores y desglose por tipos de Conventional Commits integrados.
    *   Búsqueda y filtrado reactivo por colaborador, con atenuación de nodos ajenos y panel lateral de metadatos completos.

*   **Non-Goals:**
    *   No se utilizarán plantillas web genéricas de tipo "dashboard administrativo con widgets de tarjetas".
    *   No se creará una aplicación web cliente-servidor con backend Node.js en tiempo real.
    *   No se permitirán operaciones de escritura o modificación en el repositorio Git desde la interfaz web (es un visor de auditoría y análisis de solo lectura).
    *   No se descargarán librerías externas mediante CDN en tiempo de ejecución (todos los estilos y scripts deben viajar incrustados para garantizar compatibilidad offline estricta).

### Decisions & Rationale

1. **Sistema de Diseño Visual: Estética Nativa Git/GitLab de Alta Densidad (Zero-Cards Layout):**
   * *Decisión:* Descartar el paradigma habitual de "tarjetas sobre tarjetas" (*card soup*). Implementar un layout inspirado directamente en el gráfico de repositorio de GitLab (*GitLab Network Graph*):
     - **Carril de Grafo SVG Integrado:** Columna izquierda fija de carriles de ramificación continuos (ancho dinámico según la cantidad de ramas concurrentes) donde los nodos de commit son círculos nítidos (radio 4px) y las conexiones son curvas Bézier cúbicas suaves.
     - **Registro de Commits Compacto:** Fila tabular alineada verticalmente con cada nodo del grafo, conteniendo: insignia de rama (*pill*), hash corto en fuente monoespaciada, asunto del commit con prefijo Conventional Commit coloreado, avatar/inicial del autor y fecha relativa.
     - **Tokens de Color GitLab:**
       ```css
       :root {
         --gl-bg: #18191d;
         --gl-sub-bg: #1f1e24;
         --gl-border: #28292d;
         --gl-text: #ececef;
         --gl-text-muted: #89888d;
         --gl-accent: #7b58cf;
         --gl-lane-0: #6366f1;
         --gl-lane-1: #10b981;
         --gl-lane-2: #f59e0b;
         --gl-lane-3: #ec4899;
         --gl-lane-4: #06b6d4;
         --gl-lane-5: #8b5cf6;
         --gl-font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, Menlo, Consolas, monospace;
       }
       ```
   * *Razón:* Los ingenieros de software valoran la densidad de datos y la familiaridad con las herramientas con las que trabajan a diario (GitLab, GitHub, GitLens). Un diseño recargado de tarjetas dificulta la trazabilidad y la lectura cronológica.

2. **Incrustación de Datos JSON en Etiqueta `<script>`:**
   * *Decisión:* Serializar la estructura completa del DAG (`topology` y `collaborators`) dentro de `<script id="gitdoc-data" type="application/json">`.
   * *Razón:* Al abrir archivos locales con el protocolo `file:///`, los navegadores modernos restringen llamadas `fetch()` a ficheros externos por políticas de seguridad (CORS). Incrustar el payload JSON directamente en el DOM garantiza carga instantánea y funcionamiento 100% offline.

3. **Arquitectura Visual Híbrida en Cliente (Lienzo SVG + Árbol DOM):**
   * *Decisión:* Utilizar un motor SVG reactivo ligero para el lienzo de Grafo de Commits y un componente nativo basado en DOM HTML para la vista de Árbol Jerárquico de Ramas.
   * *Razón:* El Grafo de Commits requiere dibujo vectorial continuo de aristas y curvas Bézier con zoom/paneo fluido. En contraste, el Árbol de Ramas se beneficia del DOM nativo con guías lineales monoespaciadas estilo GitLab para accesibilidad, interactividad de colapso/expansión y selección de texto natural.

4. **Cálculo y Agregación de Resúmenes de Merge Tipo Git:**
   * *Decisión:* Precalcular o inferir en memoria el conjunto de commits que componen cada fusión entre el `forkPoint` y el `mergeCommit` (o punto de unión fast-forward), generando una estructura de resumen:
     ```json
     {
       "title": "Merge branch 'feat/auth' into 'dev'",
       "totalCommits": 6,
       "contributors": ["Ana", "Carlos"],
       "typesSummary": { "feat": 4, "fix": 2 },
       "hashRange": "f74cb12..8e3de67"
     }
     ```
   * *Razón:* Facilita una comprensión ejecutiva instantánea del impacto de la integración, replicando el comportamiento estándar de Git (`git log --merges` y descripciones automáticas de PRs).

5. **Tratamiento de Commits No Relevantes bajo Modo Verboso:**
   * *Decisión:* Marcar los commits en la serialización con una propiedad `isRelevant: boolean`. El visor en modo estándar los oculta o colapsa bajo un indicador resumido, mientras que el "Modo Verboso" los despliega con opacidad tenue e insignias `[non-conventional]`.
   * *Razón:* Evita contaminar la vista arquitectónica en repositorios con commits de prueba o WIPs desordenados, pero preserva la capacidad forense total cuando el auditor necesita auditar el 100% del historial.

6. **Aislamiento de Ramas y Hoja de Estilos de Impresión (`@media print`):**
   * *Decisión:* Integrar un mecanismo de aislamiento genealógico que, al combinarse con reglas CSS `@media print`, oculte controles de UI (zoom, buscador, navbars) y presente una ficha ejecutiva clara de la rama aislada con fondo blanco, resumen de merge y tablas tipográficas ordenadas.
   * *Razón:* Los auditores y directores de ingeniería necesitan frecuentemente adjuntar el reporte de una funcionalidad o release a tickets de Jira o actas de entrega en formato PDF sin elementos distractores de interfaz.

### Risks & Trade-offs

*   **[Saturación de Nodos en Repositorios Enormes con Modo Verboso]** $\rightarrow$ **Mitigación:** En modo verboso, implementar renderizado diferido o paginado de los commits dentro de cada rama del árbol, y limitar los cuerpos extensos a tarjetas colapsables bajo demanda.
*   **[Detección de Merges en Fast-Forward sin Commit de Fusión]** $\rightarrow$ **Mitigación:** Utilizar la clasificación del motor topológico del Hito 11 y 12 que identifica fusiones tanto tradicionales (con merge commit de múltiples padres) como por *fast-forward* gracias a la pertenencia de ancestros.

### Migration Plan

*   La generación del reporte HTML se activará explícitamente mediante la bandera `-H, --html` (ej. `tu-doc-cli generate graph --html` o `tu-doc-cli graph --html`).
*   La inclusión inicial de commits no relevantes vendrá gobernada por la bandera `-v, --verbose`, pudiendo alternarse en vivo en cualquier momento dentro de la interfaz web generada.

---

## 2. Tasks & Implementation Checklist

### 1. Plantilla y Sistema de Diseño Técnico GitLab (`templates/graph-viewer.html`)
- [ ] 1.1 Diseñar layout de alta densidad inspirado estrictamente en **GitLab Repository Graph** (sin cards anidadas ni paddings abultados): barra superior técnica compacta, carril SVG de grafo a la izquierda y log tabular de commits.
- [ ] 1.2 Implementar sistema de variables CSS con paleta nativa de GitLab (tema oscuro `#18191d` y tema claro técnico) e incorporar tipografía monoespaciada para metadatos (`JetBrains Mono`, `ui-monospace`).
- [ ] 1.3 Diseñar insignias de rama tipo *pill badge* (`gl-badge`), badges de Conventional Commits y botones de control compactos.
- [ ] 1.4 Incorporar barra de herramientas técnica con controles de zoom (+ / - / reset), alternador de vista (Grafo / Árbol / Solo Relaciones), switch de Modo Verboso y botón de impresión rápida.

### 2. Motor de Grafo de Commits (Timeline SVG Estilo GitLab)
- [ ] 2.1 Desarrollar generador de carriles paralelos con espaciado constante y curvas Bézier suaves para bifurcaciones (`fork`) y fusiones (`merge`), alineados exactamente con las filas del log de commits.
- [ ] 2.2 Dibujar nodos circulares nítidos de commits (radio 4px, borde 2px con color de rama) y puntos dobles para commits de merge.
- [ ] 2.3 Implementar interacciones de arrastre (*drag/pan*), rueda del ratón (*zoom*) y tooltips informativos al pasar el cursor sobre los commits y nodos de merge.

### 3. Motor de Árbol Jerárquico de Ramas (Branch Tree View DOM)
- [ ] 3.1 Desarrollar componente de árbol jerárquico interactivo con guías lineales (`1px solid var(--gl-border)`) tipo explorador de archivos de GitLab, trasladando la lógica genealógica de `src/graph/terminal.js`.
- [ ] 3.2 Mostrar insignias de estado con colores distintivos: `[base]` (verde/blanco), `[activa]` (azul), `[fusionada]` (púrpura) y `[divergente]` (amarillo).
- [ ] 3.3 Presentar métricas de sincronización (`ahead / behind`), conteo total de commits y badges de colaboradores principales.
- [ ] 3.4 Desplegar lista anidada de commits bajo cada rama con truncado dinámico (+N commits más) y acceso al panel de detalles.

### 4. Resúmenes de Merge Tipo Git y Modo Solo Relaciones
- [ ] 4.1 Implementar generador de resumen de merge estilo Git (`title`, `commitsCount`, `contributors`, `typesSummary`) para ramas fusionadas y puntos de integración.
- [ ] 4.2 Incorporar tarjeta visual desplegable de resumen de merge al hacer clic en aristas de integración o nodos de merge.
- [ ] 4.3 Implementar conmutador "Solo Relaciones de Ramas" que oculte los commits individuales y presente el diagrama DAG de ramas puras con sus conexiones.
- [ ] 4.4 Construir selector bilateral de ramas (Rama Base vs Rama Evaluada) que aísle el análisis y síntesis de integración bilateral.

### 5. Modo de Verbosidad e Inclusión de Commits No Relevantes
- [ ] 5.1 Clasificar commits en la serialización (`isRelevant`, `isConventional`, `isMerge`) para admitir filtrado selectivo en cliente.
- [ ] 5.2 Programar interruptor reactivo "Modo Verboso" en el visor para alternar entre vista curada y vista exhaustiva con todos los commits.
- [ ] 5.3 Renderizar commits no convencionales o auxiliares con estilo visual diferenciado y exponer el cuerpo descriptivo completo (`body`) en el panel lateral.

### 6. Aislamiento de Scope y Motor de Impresión (`@media print`)
- [ ] 6.1 Implementar función de aislamiento en cliente: seleccionar una rama y ocultar o atenuar el resto del árbol dejando únicamente el subgrafo genealógico conexo.
- [ ] 6.2 Diseñar hoja de estilos `@media print` que suprima barras de navegación, botones flotantes, ajuste el fondo a blanco y optimice la tipografía para páginas A4/Carta.
- [ ] 6.3 Implementar botón "Imprimir / Guardar PDF" que active `window.print()` aplicando automáticamente el alcance aislado actual y la ficha de resumen de merge.

### 7. Filtrado por Colaboradores y Panel de Metadatos
- [ ] 7.1 Implementar buscador/selector reactivo de colaboradores con realce visual dinámico de ramas y commits en ambas vistas (Grafo y Árbol).
- [ ] 7.2 Desarrollar panel lateral deslizable técnico que muestre metadatos completos al hacer clic en un commit, rama o evento de merge.

### 8. Compilador de Bundle HTML (`src/graph/html.js`) y Pipeline
- [ ] 8.1 Crear módulo `src/graph/html.js` con la función `generateHtmlViewer(topologyData, collaboratorsData, options)` que serialice el JSON e inyecte los assets en la plantilla.
- [ ] 8.2 Integrar las opciones `--html` y `-v, --verbose` en `src/pipeline.js` y `src/renderer.js` para persistir el archivo `GRAPH.html`.
- [ ] 8.3 Incorporar catálogos de internacionalización i18n (`es` y `en`) para todos los textos fijos de la interfaz web del visor.

### 9. Pruebas Unitarias y de Integración
- [ ] 9.1 Desarrollar `tests/unit/html-viewer.test.js` verificando la generación del bundle HTML, validez sintáctica, serialización de datos y cálculo de resúmenes de merge.
- [ ] 9.2 Validar que el archivo HTML generado opere limpiamente bajo protocolo `file:///` sin bloqueos de scripts ni llamadas externas.
- [ ] 9.3 Probar escenarios de conmutación de verbosidad, aislamiento de scope y visualización dual.
