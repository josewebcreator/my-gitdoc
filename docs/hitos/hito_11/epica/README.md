# Épica 11: Software Design Document (SDD) & Tasks - Topología y Colaboradores

> **Estándar OpenSpec SDD (Spec-Driven Development)**  
> Este documento contiene el Diseño de Software (*Design Document*) y el Desglose de Tareas (*Tasks Checklist*) del Hito 11 conforme a las directrices de [OpenSpec](https://openspec.dev/).

---

## 1. Software Design Document (SDD)

### Context
Hasta la Fase 2, `git.js` implementaba un extractor lineal basado en `git log` que asume un historial secuencial entre un `--from` y un `--to`. Para soportar ramas concurrentes y colaboradores paralelos, se requiere una representación de Grafo Acíclico Dirigido (DAG) donde cada nodo almacene sus hashes padres (`parents`), su rama de pertenencia inferida y sus metadatos de autoría.

### Goals / Non-Goals
*   **Goals:**
    *   Construir una estructura de datos en memoria que represente el DAG de ramas sin desbordar el consumo de memoria Heap (< 100 MB).
    *   Identificar relaciones de bifurcación (*fork points*) y fusiones (*merges*) de manera determinista.
    *   Calcular métricas analíticas por colaborador (commits totales, autores únicos, scopes) por cada rama.
    *   Completar el análisis en menos de 3 segundos para 50 ramas (RNF-7).
*   **Non-Goals:**
    *   No se reconstruirán árboles de diferencias de código línea por línea (*git diff / blame* exhaustivo).
    *   No se requiere conectividad de red remota (el análisis opera 100% sobre el repositorio Git local).

### Decisions & Rationale
1. **Reconstrucción Topológica vía `git rev-list --parents`:**
   * *Decisión:* Consultar el historial con formato `--parents --format="%H%x00%P%x00%an%x00%ae%x00%at%x00%s"`.
   * *Razón:* Provee en una sola pasada atómica el hash, los padres del commit, el nombre y email del autor, la marca temporal UNIX y el subject, evitando múltiples invocaciones a subprocesos de Git por cada nodo.
   * *Alternativas consideradas:* Consultar cada commit individualmente mediante `simpleGit.show()` (descartado por degradación exponencial del rendimiento).

2. **Detección de Rama Base Dinámica:**
   * *Decisión:* Probar secuencialmente `main`, `master`, `develop` o la rama apuntada por `origin/HEAD`. Si ninguna existe, seleccionar la rama con el commit más reciente.
   * *Razón:* Garantiza que proyectos con diferentes convenciones de nombramiento de rama principal se analicen automáticamente sin configuración previa.

### Risks & Trade-offs
*   **[Ramas con Historiales Masivos o Huérfanas]** $\rightarrow$ **Mitigación:** Aplicar un límite de profundidad configurable y manejar excepciones para ramas sin ancestro común marcándolas como ramas desconectadas/huérfanas sin interrumpir el proceso.
*   **[Rendimiento en Repositorios Grandes]** $\rightarrow$ **Mitigación:** Indexar los commits en un `Map<hash, CommitNode>` para búsquedas de ancestros en tiempo $O(1)$.

### Migration Plan
*   Las funciones de extracción lineal existentes en `src/git.js` (`getCommits`) se preservan intactas para garantizar el funcionamiento continuo del generador de `CHANGELOG` y `PAP`.

---

## 2. Tasks & Implementation Checklist

### 1. Extensión de Primitivas Git
- [ ] 1.1 Añadir en `src/git.js` función `getAllBranches()` que devuelva nombres limpios y hashes HEAD de todas las ramas locales y remotas.
- [ ] 1.2 Añadir en `src/git.js` función `getMergeBase(refA, refB)` para resolver ancestros comunes mediante `git merge-base`.
- [ ] 1.3 Implementar consulta optimizada por stream con delimitadores de bytes nulos (`\x00`) para extracción de commits y padres.

### 2. Motor de Topología de Ramas (`src/graph/topology.js`)
- [ ] 2.1 Crear algoritmo constructor del DAG asociando cada commit con su lista de hashes padres.
- [ ] 2.2 Implementar detección de rama base automática (`main` / `master` / `develop` / HEAD).
- [ ] 2.3 Identificar para cada rama su punto de divergencia (*fork point*) respecto a la rama base.
- [ ] 2.4 Clasificar commits de merge y etiquetar estado de cada rama (`active`, `merged`, `diverged`).

### 3. Métricas y Atribución de Colaboradores (`src/graph/collaborators.js`)
- [ ] 3.1 Agrupar commits por rama y calcular estadísticas de colaboradores (nombre, email, conteo de commits).
- [ ] 3.2 Extraer y mapear rangos de fechas de actividad por autor en cada rama.
- [ ] 3.3 Parsear Conventional Commits de cada autor para extraer scopes y tipos predominantes trabajados.

### 4. Filtros y Pruebas Unitarias
- [ ] 4.1 Implementar lógica de filtrado por `--branch`, `--author`, `--since`, `--until` sobre la estructura topológica.
- [ ] 4.2 Crear `tests/unit/topology.test.js` con un repositorio Git de prueba (*fixture*) con múltiples ramas y merges.
- [ ] 4.3 Medir tiempo de ejecución y consumo de memoria para certificar el cumplimiento de **RNF-7**.
