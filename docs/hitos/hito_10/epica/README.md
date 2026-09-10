# Épica 10: Software Design Document (SDD) & Tasks - Internacionalización

> **Estándar OpenSpec SDD (Spec-Driven Development)**  
> Este documento contiene el Diseño de Software (*Design Document*) y el Desglose de Tareas (*Tasks Checklist*) del Hito 10 conforme a las directrices de [OpenSpec](https://openspec.dev/).

---

## 1. Software Design Document (SDD)

### Context
Actualmente, las cadenas de caracteres y mapeos como `TYPE_TITLES` en `src/renderer.js` están codificados directamente (*hardcoded*) en español. Asimismo, los mensajes de consola en `src/pipeline.js` y las preguntas interactivas en `src/wizard.js` carecen de una capa de abstracción para internacionalización.

### Goals / Non-Goals
*   **Goals:**
    *   Proveer una función pura `t(key, params)` con interpolación simple de variables.
    *   Soportar catálogos jerárquicos en formato JSON estándar (`es.json`, `en.json`).
    *   Permitir sobrescritura limpia de cualquier clave desde `.gitdocrc.json`.
    *   Cero dependencias externas pesadas en tiempo de ejecución.
*   **Non-Goals:**
    *   No se implementará traducción automática ni integración con APIs externas de traducción en tiempo real.
    *   No se dará soporte a formatos binarios de localización tipo GNU gettext (`.mo`/`.po`).

### Decisions & Rationale
1. **Módulo i18n Ligero Interno vs Librerías Externas (`i18next` / `formatjs`):**
   * *Decisión:* Implementar un módulo minimalista nativo en `src/i18n/index.js` (~80 líneas de código).
   * *Razón:* Mantiene el tamaño del paquete NPM ultra ligero, acelera el tiempo de arranque de la CLI y evita dependencias transitivas innecesarias para un conjunto finito de cadenas.
   * *Alternativas consideradas:* `i18next` (descartado por sobrecarga de dependencias y tamaño en un CLI ligero).

2. **Estructura de Catálogos por Claves de Dominio con Notación de Puntos:**
   * *Decisión:* Claves estructuradas tipo `cli.errors.noRepo`, `sections.feat`, `wizard.init.welcome`.
   * *Razón:* Facilita la navegación en los archivos JSON y permite sobrescrituras parciales limpias vía `deepMerge`.

### Risks & Trade-offs
*   **[Riesgo de Claves Faltantes en Idiomas Personalizados]** $\rightarrow$ **Mitigación:** La función `t(key)` siempre evalúa el idioma solicitado; si la clave no existe, recurre al catálogo en inglés (`fallback`) y finalmente retorna el nombre de la clave literal en lugar de lanzar una excepción fatal.
*   **[Discrepancia en Strings del Wizard]** $\rightarrow$ **Mitigación:** Centralizar todas las opciones y mensajes de `@inquirer/prompts` en el archivo de idioma respectivo.

### Migration Plan
*   Los proyectos existentes que no cuenten con la propiedad `locale` en `.gitdocrc.json` continuarán operando con normalidad, detectando el idioma del sistema con fallback seguro a inglés (`en`), manteniendo retrocompatibilidad absoluta.

---

## 2. Tasks & Implementation Checklist

### 1. Módulo Core i18n y Diccionarios
- [ ] 1.1 Crear directorio `src/i18n/` y catálogos nativos `src/i18n/locales/es.json` y `src/i18n/locales/en.json`.
- [ ] 1.2 Implementar en `src/i18n/index.js` la resolución jerárquica de locale (`--lang` > `.gitdocrc.json` > `Intl`/entorno > fallback `en`).
- [ ] 1.3 Implementar la función de traducción e interpolación `t(key, params)` con fallback automático a inglés.
- [ ] 1.4 Implementar soporte para fusionar diccionarios locales definidos en la propiedad `"i18n"` de `.gitdocrc.json`.

### 2. Integración en Renderer y Plantillas
- [ ] 2.1 Refactorizar `src/renderer.js` para eliminar el objeto estático `TYPE_TITLES` y consumir títulos de sección mediante `t()`.
- [ ] 2.2 Actualizar las plantillas `templates/changelog.hbs` y `templates/pap.hbs` para usar encabezados internacionalizados.
- [ ] 2.3 Traducir las etiquetas de directivas técnicas del PAP (`Ejecución:`, `Marcha Atrás:`, `Pruebas de Humo:`).

### 3. Integración en CLI y Wizard Interactivo
- [ ] 3.1 Registrar la bandera global `-l, --lang <código>` en `bin/cli.js` y propagarla al pipeline.
- [ ] 3.2 Localizar los mensajes de retroalimentación en consola (`picocolors`) en `src/pipeline.js` y `bin/cli.js`.
- [ ] 3.3 Refactorizar las preguntas y opciones de selección de `@inquirer/prompts` en `src/wizard.js` usando `t()`.
- [ ] 3.4 Añadir pregunta de selección de idioma en el flujo `runWizardInit()` si no existe en `.gitdocrc.json`.

### 4. Pruebas y Validación
- [ ] 4.1 Crear `tests/unit/i18n.test.js` verificando precedencia de idiomas y resolución de claves anidadas.
- [ ] 4.2 Probar escenarios de fallback cuando se solicitan claves inexistentes o idiomas no soportados.
- [ ] 4.3 Validar que `npm test` ejecute con 100% de éxito en todos los flujos adaptados.
