# Hito 11: Extractor Topológico y Análisis de Ramas y Colaboradores

> **Estándar OpenSpec SDD (Spec-Driven Development)**  
> Este documento define la propuesta (*Proposal*) y las especificaciones normativas con escenarios ejecutables (*Delta Specs*) según el estándar [OpenSpec](https://openspec.dev/).

---

## 1. Proposal

### Why
En equipos ágiles, múltiples desarrolladores crean e integran ramas en paralelo (ramas de funcionalidad, hotfixes, refactorizaciones). Actualmente `tu-doc-cli` solo extrae un historial lineal de commits para la rama actual. Para entender la arquitectura viva del repositorio, diagnosticar cuellos de botella y auditar qué colaboradores participaron en el desarrollo de cada rama antes de su integración, se requiere un extractor topológico robusto capaz de reconstruir el grafo acíclico dirigido (DAG) de Git.

### What Changes
*   Creación del módulo `src/graph/topology.js` para descubrir ramas, calcular ancestros comunes (`git merge-base`) y mapear puntos de bifurcación y unión.
*   Creación del módulo `src/graph/collaborators.js` para extraer y resumir las métricas de contribución por autor (volumen de commits, scopes impactados y fechas extremas) para cada rama.
*   Extensión de los métodos de bajo nivel en `src/git.js` para invocar comandos de referencias y grafos de forma eficiente y segura.
*   Soporte para filtros de acotación: `--all` (por defecto), `--branch <nombre>`, `--author <patrón>`, `--since <fecha>`, `--until <fecha>`, `--from <ref>` y `--to <ref>`.

### Capabilities
#### New Capabilities
*   `git-topology-extraction`: Motor que analiza la base de objetos de Git para inferir la genealogía entre ramas (rama padre, punto de desprendimiento y merge commits).
*   `collaborator-attribution`: Agregador analítico que asocia autores, frecuencia de commits, periodos de actividad y áreas del código modificadas por cada rama.
*   `topological-filters`: Mecanismo de filtrado por autor, ventana de tiempo y ramas específicas.

#### Modified Capabilities
*   `git-core`: Inclusión de wrappers en `src/git.js` para consultas de referencias (`branchLocal`, `branch -a`, `merge-base`, `rev-list --parents`).

### Impact
*   **Archivos afectados:** `src/git.js`, `src/graph/topology.js`, `src/graph/collaborators.js`.
*   **Dependencias:** `simple-git` y ejecución optimizada de comandos nativos `git` mediante subprocesos cuando se requiera streaming de revisiones.

---

## 2. Specifications & Scenarios (Delta Specs)

### Requirement: Descubrimiento Integral de Ramas
El sistema DEBE (*SHALL*) listar e inspeccionar todas las ramas locales y de seguimiento remoto disponibles en el repositorio local cuando la opción `--all` esté activa (comportamiento predeterminado).

#### Scenario: Repositorio con ramas locales y remotas origin
- **WHEN** se ejecuta el análisis topológico en un repositorio con ramas `main`, `feature/auth` y `origin/feature/payments`
- **THEN** el extractor normaliza e incluye todas las ramas evitando duplicaciones de referencias idénticas.

#### Scenario: Repositorio con una única rama
- **WHEN** el repositorio contiene exclusivamente la rama `main`
- **THEN** el sistema extrae la topología lineal sin emitir errores de bifurcación vacía.

---

### Requirement: Cálculo Genealógico y Puntos de Bifurcación
El sistema DEBE (*SHALL*) calcular el ancestro común (*merge base*) entre cada rama secundaria y la rama principal/base para determinar el commit exacto donde se desprendió la rama (*fork point*).

#### Scenario: Rama de funcionalidad desprendida de main
- **WHEN** la rama `feature/cart` se bifurcó del commit `a1b2c3d` de `main` y contiene 4 commits propios
- **THEN** la estructura de datos topológica registra a `main` como rama base, `a1b2c3d` como punto de bifurcación y los 4 commits como nodos pertenecientes a `feature/cart`.

#### Scenario: Detección de rama fusionada (merged)
- **WHEN** la rama `feature/cart` fue integrada a `main` mediante un commit de merge `f9e8d7c`
- **THEN** el sistema etiqueta el estado de la rama como `merged` y referencia el hash de merge correspondiente.

---

### Requirement: Agregación de Métricas de Colaboradores por Rama
El sistema DEBE (*SHALL*) agregar para cada rama la lista exhaustiva de colaboradores únicos que hayan realizado commits, contabilizando sus aportes individuales y sus scopes de Conventional Commits.

#### Scenario: Múltiples trabajadores en una misma rama
- **WHEN** dos colaboradores ("Ana" y "Carlos") realizan 3 y 2 commits respectivamente en la rama `feature/ui`
- **THEN** el reporte de colaboradores de `feature/ui` lista a ambos autores, sus cantidades respectivas de commits y el rango de fechas de su participación.

---

### Requirement: Filtros Topológicos Configurables
El sistema DEBE (*SHALL*) permitir aislar el análisis a ramas, autores o ventanas de tiempo específicas según los parámetros suministrados.

#### Scenario: Filtrado por desarrollador específico
- **WHEN** el usuario pasa la bandera `--author "Carlos"`
- **THEN** el análisis excluye del grafo resultante las ramas y commits en los que "Carlos" no haya tenido participación directa.

#### Scenario: Acotación temporal por fecha
- **WHEN** el usuario especifica `--since "2026-01-01"`
- **THEN** solo se procesan las bifurcaciones y commits generados con fecha igual o posterior a dicha fecha.

---

## 3. Detalle de Épica y Diseño Técnico
Para consultar el documento de diseño arquitectónico (**SDD**) y el checklist de tareas de implementación (**Tasks**), acceda a:
*   👉 **[Épica 11: SDD & Implementation Tasks](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_11/epica/README.md)**
