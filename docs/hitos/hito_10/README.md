# Hito 10: Motor de Internacionalización (i18n) y Localización Completa

> **Estándar OpenSpec SDD (Spec-Driven Development)**  
> Este documento define la propuesta (*Proposal*) y las especificaciones normativas con escenarios ejecutables (*Delta Specs*) según el estándar [OpenSpec](https://openspec.dev/).

---

## 1. Proposal

### Why
`tu-doc-cli` genera actualmente documentación con títulos fijos en español y muestra mensajes de terminal monolingües. Para proyectos de escala global, monorepos internacionales y equipos con desarrolladores angloparlantes, el CLI debe ser bilingüe de forma nativa (`es` y `en`), permitiendo además incorporar diccionarios corporativos personalizados sin modificar el código fuente.

### What Changes
*   Creación del subsistema `src/i18n/` para gestión de catálogos y resolución contextual de textos.
*   Inclusión de catálogos de traducción completos en `src/i18n/locales/es.json` y `src/i18n/locales/en.json`.
*   Soporte de la bandera `-l, --lang <código>` en el comando principal y subcomandos.
*   Capacidad de declarar `"locale"` y `"i18n"` en `.gitdocrc.json` con fusión recursiva (*deep merge*).
*   Refactorización de `renderer.js` y plantillas Handlebars para usar claves de localización en títulos y directivas técnicas.
*   Localización integral de las salidas de terminal (`picocolors`) y de todas las preguntas interactivas de `@inquirer/prompts` en `wizard.js`.

### Capabilities
#### New Capabilities
*   `i18n-core`: Motor centralizado de resolución de idioma, jerarquía de precedencia y función de formateo `t(key, params)`.
*   `localized-deliverables`: Plantillas de `CHANGELOG.md` y `PAP.md` localizadas dinámicamente según el idioma activo.
*   `localized-cli-wizard`: Salidas de consola, banderas de ayuda y asistente conversacional interactivo en el idioma seleccionado.

#### Modified Capabilities
*   `configuration`: Soporte para las propiedades `locale` y el bloque `i18n` en el esquema de `.gitdocrc.json`.
*   `renderer`: Desacoplamiento de mapeos estáticos `TYPE_TITLES` reemplazándolos por llamadas al motor i18n.

### Impact
*   **Archivos afectados:** `bin/cli.js`, `src/pipeline.js`, `src/renderer.js`, `src/wizard.js`, `templates/changelog.hbs`, `templates/pap.hbs`.
*   **Dependencias:** Uso de APIs nativas de Node.js (`Intl`) sin agregar dependencias externas pesadas de i18n.

---

## 2. Specifications & Scenarios (Delta Specs)

### Requirement: Resolución Jerárquica del Idioma Activo
El sistema DEBE (*SHALL*) determinar el idioma activo evaluando en orden de precedencia estricto: bandera de línea de comandos, configuración local `.gitdocrc.json`, configuración del sistema operativo y valor de respaldo por defecto (*fallback*).

#### Scenario: Precedencia de bandera CLI sobre configuración local
- **WHEN** el usuario ejecuta `tu-doc-cli generate changelog --lang en` en un proyecto configurado con `"locale": "es"` en `.gitdocrc.json`
- **THEN** el sistema resuelve el idioma activo como `en` e imprime los títulos del documento en inglés.

#### Scenario: Fallback a inglés ante idioma no soportado o ausencia de configuración
- **WHEN** el usuario no especifica `--lang`, no existe `.gitdocrc.json` y el locale del sistema no cuenta con catálogo disponible
- **THEN** el sistema adopta automáticamente el idioma de respaldo `en`.

---

### Requirement: Extensibilidad y Sobrescritura de Diccionarios
El sistema DEBE (*SHALL*) permitir extender o sobrescribir cualquier clave léxica mediante el bloque `"i18n"` en el archivo `.gitdocrc.json`.

#### Scenario: Sobrescritura de título de sección corporativa
- **WHEN** el archivo `.gitdocrc.json` define `{"i18n": {"es": {"sections.feat": "Entregas de Producto"}}}`
- **THEN** el renderizador reemplaza "Nuevas Características" por "Entregas de Producto" en el Changelog renderizado en español.

#### Scenario: Incorporación de un nuevo idioma no nativo
- **WHEN** el usuario configura `"locale": "fr"` y proporciona el catálogo de claves correspondiente en `"i18n.fr"` dentro de `.gitdocrc.json`
- **THEN** el sistema carga y renderiza los entregables en francés sin arrojar excepciones de clave faltante.

---

### Requirement: Localización de Entregables de Documentación
El sistema DEBE (*SHALL*) renderizar los títulos de tipo de commit, encabezados de componente, advertencias de cambios disruptivos y directivas técnicas del PAP en el idioma activo.

#### Scenario: Renderizado bilingüe de secciones de Changelog
- **WHEN** se solicita generar un Changelog con commits de tipo `feat`, `fix`, `perf` y `breakingChanges` en idioma `en`
- **THEN** el documento generado contiene los encabezados `## ⚠️ Breaking Changes`, `## Features`, `## Bug Fixes` y `## Performance Improvements`.

#### Scenario: Localización de etiquetas del PAP
- **WHEN** se genera un reporte PAP en idioma `en`
- **THEN** las secciones técnicas muestran `**Execution:**`, `**Rollback:**` y `**Smoke Tests / Verification:**`.

---

### Requirement: Localización de Consola y Wizard
El sistema DEBE (*SHALL*) presentar todas las descripciones de Commander, mensajes de advertencia/éxito y preguntas de `@inquirer/prompts` en el idioma activo.

#### Scenario: Wizard interactivo ejecutado en español
- **WHEN** el usuario inicia `tu-doc-cli wizard` con idioma resuelto en español
- **THEN** el menú inicial muestra `¿Qué deseas hacer?` y las opciones en perfecto español.

#### Scenario: Reporte de errores de linter localizado
- **WHEN** el linter detecta términos prohibidos ejecutando en idioma `en`
- **THEN** la consola reporta `❌ Business linter found invalid commits:` y los detalles en inglés.

---

## 3. Detalle de Épica y Diseño Técnico
Para consultar el documento de diseño arquitectónico (**SDD**) y el checklist de tareas de implementación (**Tasks**), acceda a:
*   👉 **[Épica 10: SDD & Implementation Tasks](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_10/epica/README.md)**
