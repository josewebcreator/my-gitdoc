# Hito 14: Integración en CLI, Pipeline Unificado y Wizard Conversacional

> **Estándar OpenSpec SDD (Spec-Driven Development)**  
> Este documento define la propuesta (*Proposal*) y las especificaciones normativas con escenarios ejecutables (*Delta Specs*) según el estándar [OpenSpec](https://openspec.dev/).

---

## 1. Proposal

### Why
Para que las innovaciones de la Fase 3 (soporte multilenguaje, extracción topológica, diagramas Mermaid con granularidad dual y reportes HTML interactivos) sean fácilmente adoptadas por los usuarios, deben estar completamente integradas y ser accesibles a través de múltiples interfaces ergonómicas: comandos de terminal directos, la interfaz de generación unificada existente y el asistente interactivo paso a paso.

### What Changes
*   Registro del comando de primer nivel `tu-doc-cli graph [opciones]` en `bin/cli.js`.
*   Ampliación de `tu-doc-cli generate <tipo>` para aceptar `graph` como tercer tipo válido junto a `changelog` y `pap`.
*   Actualización de `src/pipeline.js` para despachar el flujo hacia el generador de grafos según las opciones suministradas.
*   Implementación de la función `runWizardGraph()` en `src/wizard.js` con selección interactiva de ramas, colaboradores, granularidad y formato de salida (Markdown o HTML).
*   Integración de la nueva opción de grafo en el menú principal del Wizard interactivo.
*   Desarrollo de pruebas de integración de extremo a extremo (E2E) en `tests/integration/cli-graph.test.js`.

### Capabilities
#### New Capabilities
*   `direct-graph-command`: Comando CLI dedicado `tu-doc-cli graph` con banderas completas de filtrado y visualización.
*   `wizard-graph-flow`: Asistente interactivo guiado para configurar y exportar mapas de ramas y colaboradores.
*   `unified-pipeline-routing`: Enrutamiento coherente del pipeline de ejecución entre changelog, pap y grafos.

#### Modified Capabilities
*   `generate-command`: Extensión de la validación de tipos en `tu-doc-cli generate` admitiendo `['changelog', 'pap', 'graph']`.
*   `wizard-main-menu`: Incorporación del flujo de grafo en el menú de bienvenida del asistente.

### Impact
*   **Archivos afectados:** `bin/cli.js`, `src/pipeline.js`, `src/wizard.js`, `tests/integration/cli-graph.test.js`.
*   **Dependencias:** Totalmente compatible con la suite existente sin romper comandos previos.

---

## 2. Specifications & Scenarios (Delta Specs)

### Requirement: Comando de Primer Nivel `tu-doc-cli graph`
El sistema DEBE (*SHALL*) exponer el comando principal `tu-doc-cli graph` aceptando las banderas `--simplified`, `--html`, `--author`, `--branch`, `--since`, `--until`, `--from`, `--to`, `-o, --output` y `-l, --lang`.

#### Scenario: Invocación directa del comando graph
- **WHEN** el usuario ejecuta `tu-doc-cli graph --simplified -o docs/BRANCH_MAP.md`
- **THEN** el sistema extrae la topología, compila el diagrama simplificado en Mermaid y guarda el archivo en `docs/BRANCH_MAP.md` finalizando con código de salida `0`.

#### Scenario: Invocación con bandera HTML
- **WHEN** el usuario ejecuta `tu-doc-cli graph --html`
- **THEN** el sistema genera el reporte interactivo `GRAPH.html` e informa en consola la ruta del archivo generado.

---

### Requirement: Compatibilidad con `tu-doc-cli generate graph`
El sistema DEBE (*SHALL*) reconocer el argumento `graph` como un tipo válido en el comando unificado `generate`, manteniendo coherencia con `changelog` y `pap`.

#### Scenario: Generación mediante comando general
- **WHEN** el usuario ejecuta `tu-doc-cli generate graph`
- **THEN** el pipeline procesa la solicitud exactamente igual que el comando dedicado `graph`, persistiendo el archivo por defecto `GRAPH.md`.

#### Scenario: Argumento de tipo inválido
- **WHEN** el usuario ejecuta `tu-doc-cli generate invalid-type`
- **THEN** el CLI termina con código `1` e informa en color rojo que los tipos válidos son `changelog`, `pap` o `graph`.

---

### Requirement: Flujo Asistido en el Wizard Conversacional
El sistema DEBE (*SHALL*) proporcionar una experiencia conversacional paso a paso mediante `tu-doc-cli wizard` para guiar al usuario en la parametrización de su grafo.

#### Scenario: Generación asistida de grafo desde el Wizard
- **WHEN** el usuario inicia `tu-doc-cli wizard` y selecciona "Generar mapa de ramas y grafo de desarrollo"
- **THEN** el asistente le solicita interactivamente elegir el nivel de detalle (detallado o simplificado), las ramas a incluir, el formato de salida (Markdown o HTML) y si desea previsualizar o persistir el archivo.

---

## 3. Detalle de Épica y Diseño Técnico
Para consultar el documento de diseño arquitectónico (**SDD**) y el checklist de tareas de implementación (**Tasks**), acceda a:
*   👉 **[Épica 14: SDD & Implementation Tasks](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_14/epica/README.md)**
