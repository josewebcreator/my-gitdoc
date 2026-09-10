# 🚀 tu-doc-cli — CLI de Documentación Automática / Automated Documentation CLI

[![Tests](https://img.shields.io/badge/tests-134%20passing-brightgreen.svg)]()
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![i18n](https://img.shields.io/badge/i18n-es%20%7C%20en-purple.svg)]()

> **Lenguaje / Language:** [🇪🇸 Español](#-español) | [🇬🇧 English](#-english)

---

# 🇪🇸 Español

`tu-doc-cli` es una herramienta de consola (CLI) de alto rendimiento diseñada para automatizar la extracción, análisis topológico, trazabilidad de colaboradores y compilación de documentación técnica (`CHANGELOG` y `PAP`) a partir del historial de Git, siguiendo estrictamente el estándar de **Conventional Commits**.

Desarrollada de forma 100% determinista en **Node.js puro (ES Modules)**, procesa el Grafo Acíclico Dirigido (DAG) de Git en memoria sin desbordar el Heap (< 100 MB) y sin depender de llamadas a servicios externos de IA.

---

## 📈 Estado del Proyecto (Hitos 1 al 11)

| Hito | Estado | Descripción |
| :--- | :---: | :--- |
| **Hito 1: CLI Operativo con Validación Estricta** | 🟢 Completado | Configuración de Commander, validación estricta de argumentos y códigos de salida deterministas. |
| **Hito 2: Extracción y Parseo Semántico de Git** | 🟢 Completado | Integración con `simple-git` y `conventional-commits-parser`, manejo de repositorios vacíos o sin tags. |
| **Hito 3: Motor de Validación Estática - Linter** | 🟢 Completado | Linter de negocio con validación de tipos permitidos, campos obligatorios y filtro léxico corporativo case-insensitive. |
| **Hito 4: Agrupación, Renderizado y Generación** | 🟢 Completado | Renderizado modular Handlebars, aislamiento de Breaking Changes y simulación en terminal con `--dry-run`. |
| **Hito 5: Suite de Pruebas y Control de Calidad** | 🟢 Completado | Suite de pruebas unitarias y de integración nativas con `node --test` y mocks modulares. |
| **Hito 6: Personalización, Rutas Flexibles y Verbosidad** | 🟢 Completado | Configuración persistente `.gitdocrc.json`, rutas de salida dinámicas, plantillas externas y modo `--verbose`. |
| **Hito 7: PAP Enriquecido y Trazabilidad Remota** | 🟢 Completado | Extracción de directivas técnicas (`RUN:`, `ROLLBACK:`, `VERIFY:`) y autolinking de hashes e issues (`#NNN`). |
| **Hito 8: Asistente Interactivo CLI (Wizard)** | 🟢 Completado | Asistente interactivo guiado paso a paso con `@inquirer/prompts` (`wizard init` y `wizard generate`). |
| **Hito 9: Generador Asíncrono y Streaming** | 🟢 Completado | Pipeline basado en generadores asíncronos para extracción y parseo en memoria constante. |
| **Hito 10: Internacionalización Multilenguaje (i18n)** | 🟢 Completado | Soporte nativo bilingüe (`es` / `en`) para CLI, mensajes, errores, plantillas y catálogos extensibles. |
| **Hito 11: Extractor Topológico, Ramas y Colaboradores** | 🟢 Completado | Reconstrucción del DAG de Git, cálculo de ancestros comunes (LCA), clasificación de ramas y métricas analíticas de colaboradores. |

---

## 📖 Guía Rápida de Comandos

```bash
# Iniciar el Asistente Interactivo Integral
node bin/cli.js wizard

# Generar documentación técnica (CHANGELOG o PAP)
node bin/cli.js generate changelog --dry-run
node bin/cli.js generate pap --output docs/PAP.md

# Análisis topológico del repositorio y colaboradores
node bin/cli.js topology
node bin/cli.js topology dev --base main
node bin/cli.js graph -b feat/hito-11 --json
```

---

## 🌐 Internacionalización i18n (Hito 10)

El CLI ofrece soporte bilingüe integral en **español (`es`)** e **inglés (`en`)**. Todos los comandos, opciones, pantallas de ayuda, errores y reportes se adaptan al idioma activo.

### Orden de Precedencia
El idioma se resuelve jerárquicamente en el siguiente orden:
1. **Bandera explícita en CLI:** `-l, --lang <es|en>` (ej. `node bin/cli.js topology --lang en`).
2. **Configuración en `.gitdocrc.json`:** Campo `"locale": "es"` o `"locale": "en"`.
3. **Variables de entorno del Sistema Operativo:** Detección automática de `LC_ALL`, `LC_MESSAGES`, `LANG`.
4. **Fallback predeterminado:** Inglés (`en`).

### Catálogos de Traducción Extensibles
Puedes sobreescribir o añadir traducciones directamente en tu `.gitdocrc.json`:

```json
{
  "locale": "es",
  "i18n": {
    "es": {
      "cli": {
        "topology": {
          "header": "🌐 Panel Topológico de Mi Proyecto"
        }
      }
    }
  }
}
```

---

## 🌿 Motor Topológico y Colaboradores (Hito 11)

El comando `topology` (alias `graph`) analiza el Grafo Acíclico Dirigido (DAG) de Git para inspeccionar relaciones genealógicas entre ramas, puntos de bifurcación (*fork points*) y colaboraciones.

### Sintaxis
```bash
node bin/cli.js topology [rama-base] [opciones]
node bin/cli.js graph [rama-base] [opciones]
```

### Opciones Disponibles
| Opción | Alias | Descripción |
| :--- | :---: | :--- |
| `[rama-base]` | | Rama base de referencia (ej. `main`, `dev`). Argumento posicional opcional. |
| `-B, --base <rama>` | | Especifica la rama base de referencia explícitamente. |
| `-b, --branch <filtro>` | | Aísla el análisis a una rama específica o subcadena. |
| `-a, --author <patrón>` | | Filtra por nombre o email de colaborador. |
| `--since <YYYY-MM-DD>` | | Filtra commits desde una fecha (inclusivo desde las 00:00:00). |
| `--until <YYYY-MM-DD>` | | Filtra commits hasta una fecha (inclusivo hasta las 23:59:59). |
| `--json` | | Retorna la estructura topológica completa y métricas en JSON. |
| `-l, --lang <es\|en>` | | Selecciona el idioma del reporte (`es` o `en`). |

### Clasificación Semántica de Ramas
El motor clasifica cada rama respecto a la rama base:
*   **Rama Base (`isBase: true`):** Muestra el total de commits acumulados en su línea histórica.
*   **Ramas Fusionadas (`[fusionada]` / `[merged]`):** Detecta ramas integradas (tanto por *merge commits* como por *fast-forward*). Reporta los commits aportados (`100% integrados`), el punto de bifurcación real donde nacieron y los commits de retraso respecto a la base (`behind`).
*   **Ramas Divergentes (`[divergente]` / `[diverged]`):** Ramas que continuaron su propio desarrollo tras separarse de la base. Informa cuántos commits tienen pendientes de integrar (`ahead`), cuántos commits de retraso tienen (`behind`) y cuántos commits comparten en común con la base (`en común`).
*   **Ramas Activas (`[activa]` / `[active]`):** Ramas que van estrictamente por delante de la base y están listas para integrarse.

### Desglose Visual de Commits
Para cada rama secundaria, el CLI despliega la lista contextual de commits:
*   `↳ Pendientes de integrar en <base> (N):` Lista los commits que aún no forman parte de la base.
*   `↳ Commits aportados/integrados (N):` Lista los commits que la rama aportó a la historia común.

### Ejemplo de Salida Terminal
```text
🌐 Gitdoc — Análisis Topológico y Colaboradores
📌 Rama Base: main
🌿 Ramas Totales: 2 (0 activas, 0 fusionadas, 2 divergentes)

Ramas:
  dev [divergente] (bifurcada en f74cb12) — 31 pendientes (ahead), 4 detrás (behind) • 30 en común
    ↳ Pendientes de integrar en main (31):
      • d3a660a fix(cli): preservar rama base posicional al combinar con filtro -b
      • 4eb5761 feat(topology): soportar seleccion de rama base via bandera -B
      • 7989af4 feat(cli): soportar rama opcional como argumento posicional
      • 200124e feat(i18n): localizar comando topology y mensajes de error
      ... (+27 más)

👥 Colaboradores:
  • Jose Manuel <josewebcreator@gmail.com>: 49 commits
    Tipos: fix:1, feat:25, test:12, docs:6, perf:1, refactor:2, build:2
    Scopes: cli, topology, i18n, agentes, hito-11, collaborators, parser, git
    Ramas: dev, origin/dev
```

---

## 🧙 Asistente Interactivo (Wizard)

El CLI ofrece una interfaz interactiva paso a paso:
```bash
node bin/cli.js wizard
```

Dispone de 3 flujos:
1. **`wizard init`**: Configuración asistida de `.gitdocrc.json` (selección de idioma, rama base, tipos permitidos, términos prohibidos y URL remota).
2. **`wizard generate`**: Generación asistida de `CHANGELOG` o `PAP` con previsualización o guardado en disco.
3. **`wizard topology`** (alias `wizard graph`): Análisis guiado con selección interactiva de rama base, filtros de rama, colaborador, rango de fechas y formato terminal o JSON.

---

## 📄 Generación de Documentación (`generate`)

```bash
node bin/cli.js generate <tipo> [opciones]
```

### Argumento `<tipo>`:
*   `changelog`: Genera historial de cambios agrupado por tipos (`feat`, `fix`, `perf`, `refactor`) con sección destacada de Breaking Changes.
*   `pap`: Genera el Procedimiento de Puesta en Producción con directivas técnicas extraídas del cuerpo de los commits.

### Directivas Técnicas en Commits para PAP:
```text
ci(docker): deploy production cluster

RUN: docker-compose -f docker-compose.prod.yml up -d
MIGRATE: npm run db:migrate
ROLLBACK: docker-compose -f docker-compose.prod.yml down
VERIFY: curl -f https://api.midominio.com/health
```

---

## ⚙️ Archivo de Configuración (`.gitdocrc.json`)

```json
{
  "locale": "es",
  "baseBranch": "main",
  "remoteUrl": "https://github.com/usuario/repo",
  "allowedTypes": ["feat", "fix", "docs", "perf", "refactor", "test", "build", "ci", "chore"],
  "forbiddenTerms": {
    "hack": "mitigación",
    "workaround": "solución documentada"
  }
}
```

---

## 🧪 Pruebas Automatizadas

```bash
pnpm test
# o con Node nativo:
node --test --experimental-test-module-mocks tests/**/*.test.js
```
*Estado de la suite:* **134 pruebas pasando al 100%**.

---
---

# 🇬🇧 English

`tu-doc-cli` is a high-performance command-line interface (CLI) designed to automate Git topological extraction, branch and contributor analysis, and technical documentation generation (`CHANGELOG` and `PAP`), strictly adhering to the **Conventional Commits** specification.

Built 100% deterministically in **pure Node.js (ES Modules)**, it parses the Git Directed Acyclic Graph (DAG) in memory with strict Heap usage (< 100 MB) without relying on external AI services.

---

## 📈 Milestone Progress (Milestones 1 to 11)

| Milestone | Status | Description |
| :--- | :---: | :--- |
| **Milestone 1: Operational CLI with Strict Validation** | 🟢 Completed | Commander configuration, strict parameter validation, and deterministic exit codes. |
| **Milestone 2: Git Semantic Extraction & Parsing** | 🟢 Completed | Integration with `simple-git` and `conventional-commits-parser`, handling empty repositories and tags. |
| **Milestone 3: Static Business Linter** | 🟢 Completed | Business linter with allowed type checks, mandatory fields, and case-insensitive forbidden vocabulary filtering. |
| **Milestone 4: Grouping, Rendering & Generation** | 🟢 Completed | Handlebars modular rendering, isolated Breaking Changes section, and terminal preview with `--dry-run`. |
| **Milestone 5: Test Suite & Quality Control** | 🟢 Completed | Native unit and integration test suite using `node --test` with modular mocking. |
| **Milestone 6: Customization, Flexible Paths & Verbosity** | 🟢 Completed | Persistent `.gitdocrc.json`, custom output paths, external templates, and `--verbose` commit bodies. |
| **Milestone 7: Enriched PAP & Remote Traceability** | 🟢 Completed | Technical directive parsing (`RUN:`, `ROLLBACK:`, `VERIFY:`) and commit/issue autolinking (`#NNN`). |
| **Milestone 8: Interactive CLI Wizard** | 🟢 Completed | Step-by-step guided prompt wizard using `@inquirer/prompts` (`wizard init` and `wizard generate`). |
| **Milestone 9: Async Generators & Streaming Pipeline** | 🟢 Completed | Async generator pipeline for log extraction and semantic parsing in constant memory. |
| **Milestone 10: Multilingual Internationalization (i18n)** | 🟢 Completed | Native bilingual support (`es` / `en`) for commands, options, error messages, templates, and catalogs. |
| **Milestone 11: Topological DAG, Branches & Contributors** | 🟢 Completed | Git DAG reconstruction, Lowest Common Ancestor (LCA) resolution, branch status classification, and contributor attribution. |

---

## 📖 Command Quickstart

```bash
# Launch the Interactive Wizard
node bin/cli.js wizard

# Generate documentation (CHANGELOG or PAP)
node bin/cli.js generate changelog --dry-run
node bin/cli.js generate pap --output docs/PAP.md

# Topological analysis of repository and contributors
node bin/cli.js topology
node bin/cli.js topology dev --base main
node bin/cli.js graph -b feat/hito-11 --json
```

---

## 🌐 Internationalization (i18n - Milestone 10)

The CLI features comprehensive bilingual support in **Spanish (`es`)** and **English (`en`)**.

### Precedence Hierarchy
Language resolution follows this strict order:
1. **CLI Flag:** `-l, --lang <es|en>` (e.g. `node bin/cli.js topology --lang en`).
2. **Configuration in `.gitdocrc.json`:** `"locale": "en"` or `"locale": "es"`.
3. **OS Environment Variables:** Automatic detection from `LC_ALL`, `LC_MESSAGES`, `LANG`.
4. **Default Fallback:** English (`en`).

---

## 🌿 Topological Engine & Contributor Analysis (Milestone 11)

The `topology` command (alias `graph`) parses the Git DAG to inspect branch genealogy, bifurcation fork points, and contributor metrics.

### Syntax
```bash
node bin/cli.js topology [base-branch] [options]
node bin/cli.js graph [base-branch] [options]
```

### Options
| Option | Alias | Description |
| :--- | :---: | :--- |
| `[base-branch]` | | Reference base branch (e.g., `main`, `dev`). Optional positional argument. |
| `-B, --base <branch>` | | Explicitly set the reference base branch. |
| `-b, --branch <filter>` | | Filter analysis to a specific branch name or substring. |
| `-a, --author <pattern>` | | Filter by contributor name or email. |
| `--since <YYYY-MM-DD>` | | Filter commits since date (inclusive from 00:00:00). |
| `--until <YYYY-MM-DD>` | | Filter commits until date (inclusive through 23:59:59). |
| `--json` | | Output full topological structure and contributor metrics as formatted JSON. |
| `-l, --lang <es\|en>` | | Select output language (`es` or `en`). |

### Semantic Branch Status
*   **Base Branch (`isBase: true`):** Displays the total accumulated commits along its history.
*   **Merged Branches (`[merged]`):** Accurately tracks merged branches (via merge commits or fast-forward). Reports contributed commits (`100% integrated`), the real fork point, and behind count relative to base.
*   **Diverged Branches (`[diverged]`):** Branches with disjoint commits after bifurcating. Reports unmerged commits pending integration (`ahead`), commits behind the base (`behind`), and shared common history (`in common`).
*   **Active Branches (`[active]`):** Branches strictly ahead of base, ready to merge.

### Terminal Output Example
```text
🌐 Gitdoc — Topological Analysis & Contributors
📌 Base Branch: main
🌿 Total Branches: 2 (0 active, 0 merged, 2 diverged)

Branches:
  dev [diverged] (forked at f74cb12) — 31 unmerged (ahead), 4 behind • 30 in common
    ↳ Pending to integrate into main (31):
      • d3a660a fix(cli): preserve positional base branch when combined with -b
      • 4eb5761 feat(topology): support base branch selection via -B flag
      • 7989af4 feat(cli): support optional branch as positional argument
      ... (+28 more)

👥 Collaborators:
  • Jose Manuel <josewebcreator@gmail.com>: 49 commits
    Types: fix:1, feat:25, test:12, docs:6, perf:1, refactor:2, build:2
    Scopes: cli, topology, i18n, agentes, hito-11, collaborators, parser, git
    Branches: dev, origin/dev
```

---

## 🧙 Interactive CLI Wizard

Run the interactive assistant:
```bash
node bin/cli.js wizard
```

Features 3 flows:
1. **`wizard init`**: Guided `.gitdocrc.json` setup (language, base branch, allowed types, forbidden terms, and remote URL).
2. **`wizard generate`**: Step-by-step guided `CHANGELOG` or `PAP` generation with preview or file save.
3. **`wizard topology`** (alias `wizard graph`): Interactive topological analysis with branch selection, filters, and terminal or JSON format.

---

## ⚙️ Configuration File (`.gitdocrc.json`)

```json
{
  "locale": "en",
  "baseBranch": "main",
  "remoteUrl": "https://github.com/user/repo",
  "allowedTypes": ["feat", "fix", "docs", "perf", "refactor", "test", "build", "ci", "chore"],
  "forbiddenTerms": {
    "hack": "mitigation",
    "workaround": "documented solution"
  }
}
```

---

## 🧪 Automated Testing

```bash
pnpm test
# or using native Node test runner:
node --test --experimental-test-module-mocks tests/**/*.test.js
```
*Status:* **134 passing tests (100%)**.
