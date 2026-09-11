# Épica 14: Software Design Document (SDD) & Tasks - Integración CLI y Wizard

> **Estándar OpenSpec SDD (Spec-Driven Development)**  
> Este documento contiene el Diseño de Software (*Design Document*) y el Desglose de Tareas (*Tasks Checklist*) del Hito 14 conforme a las directrices de [OpenSpec](https://openspec.dev/).

---

## 1. Software Design Document (SDD)

### Context
Con los módulos de localización (Hito 10), topología (Hito 11), renderizado Markdown (Hito 12) y visor HTML (Hito 13) ya construidos, el Hito 14 cierra el ciclo de desarrollo unificando los puntos de contacto del usuario en `bin/cli.js`, `src/pipeline.js` y `src/wizard.js`.

### Goals / Non-Goals
*   **Goals:**
    *   Habilitar `tu-doc-cli graph` como comando autónomo de primer orden.
    *   Mantener paridad funcional con `tu-doc-cli generate graph`.
    *   Incorporar un flujo conversacional ergonómico en `wizard.js` que no requiera memorizar banderas.
    *   Garantizar cobertura de pruebas de integración con Node test runner.
*   **Non-Goals:**
    *   No se alterará la sintaxis ni el comportamiento de los comandos ya existentes de la Fase 1 y Fase 2.

### Decisions & Rationale
1. **Reutilización de Lógica mediante Función Despachadora en `pipeline.js`:**
   * *Decisión:* Crear la función `runGraphGenerate(options)` en `src/pipeline.js` que sea invocada tanto por el comando `graph`, como por `generate graph` y por `runWizardGraph()`.
   * *Razón:* Elimina la duplicación de código, centraliza el manejo de errores y garantiza que las opciones y banderas se comporten exactamente igual sin importar cómo se invoque la herramienta.

2. **Wizard con Detección Automática de Ramas Existentes:**
   * *Decisión:* En el flujo del Wizard, consultar en tiempo de ejecución las ramas locales y remotas del repositorio para ofrecerlas como lista seleccionable con casillas de verificación (*checkboxes*).
   * *Razón:* Reduce errores tipográficos de los usuarios al escribir nombres de ramas complejas como `feature/ISSUE-123-oauth2-integration`.

### Risks & Trade-offs
*   **[Sobrecarga de Opciones en CLI]** $\rightarrow$ **Mitigación:** Agrupar las opciones de ayuda de Commander de forma clara y permitir que el usuario recurra al Wizard si prefiere una guía paso a paso.

### Migration Plan
*   La lista de tipos permitidos en `generate` se amplía de `['changelog', 'pap']` a `['changelog', 'pap', 'graph']`. Los scripts que invocaban `generate changelog` o `generate pap` seguirán funcionando sin ninguna alteración.

---

## 2. Tasks & Implementation Checklist

### 1. Comandos en Commander (`bin/cli.js`)
- [ ] 1.1 Registrar comando de primer nivel `program.command('graph')` con todas sus opciones (`-s, --simplified`, `-H, --html`, `-b, --branch`, `-a, --author`, `--from`, `--to`, `--since`, `--until`, `-o, --output`, `-l, --lang`, `--dry-run`).
- [ ] 1.2 Actualizar la validación de argumentos en `program.command('generate <tipo>')` para permitir `graph`.
- [ ] 1.3 Conectar los comandos al despachador de ejecución `runGraphGenerate`.

### 2. Despachador de Pipeline (`src/pipeline.js`)
- [ ] 2.1 Implementar la función `runGraphGenerate(options)` que orquesta:
  - Carga de reglas y configuración `.gitdocrc.json`.
  - Resolución de idioma mediante `src/i18n/`.
  - Extracción topológica y agregación de colaboradores.
  - Renderizado (Mermaid Markdown, visor HTML o salida ANSI en consola).
- [ ] 2.2 Gestionar persistencia en disco o salida por stdout según `--dry-run`.

### 3. Asistente Conversacional (`src/wizard.js`)
- [ ] 3.1 Añadir la opción `"Generar mapa de ramas y grafo de desarrollo"` en el menú principal del Wizard.
- [ ] 3.2 Desarrollar la función `runWizardGraph()` con prompts de:
  - Nivel de granularidad (Simplificado / Detallado).
  - Selección de ramas (lista de ramas locales/remotas disponibles).
  - Formato de entrega (Markdown Mermaid / Visor HTML interactivo).
  - Modo simulación (previsualización) o persistencia en disco.

### 4. Pruebas de Integración y End-to-End
- [ ] 4.1 Crear `tests/integration/cli-graph.test.js` ejecutando subprocesos del CLI para verificar:
  - `tu-doc-cli graph` genera `GRAPH.md` válido.
  - `tu-doc-cli graph --html` genera `GRAPH.html` válido.
  - `tu-doc-cli generate graph` funciona con paridad total.
  - Código de salida `1` ante opciones inválidas.
- [ ] 4.2 Ejecutar suite global y confirmar que todos los tests pasen exitosamente.
