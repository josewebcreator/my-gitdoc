# Índice de Hitos y Épicas - Fase 3 (Estándar OpenSpec SDD)

Este documento contiene la planificación y especificación detallada de la **Fase 3** del CLI de Documentación Automática (`tu-doc-cli`), estructurado por hitos del 10 al 14.

> [!TIP]
> **Adopción del Estándar OpenSpec SDD (Spec-Driven Development):**  
> Todos los nuevos hitos de la Fase 3 han sido redactados siguiendo la especificación formal de **[OpenSpec](https://openspec.dev/)**:
> 1. **Proposal:** Motivación técnica (*Why*), catálogo de cambios (*What Changes*), declaración de capacidades (*Capabilities*) e impacto en el sistema (*Impact*).
> 2. **Delta Specs:** Requisitos normativos (*SHALL/MUST*) con escenarios formales ejecutables basados en sintaxis estricta `#### Scenario: ...` con cláusulas `- **WHEN** ...` y `- **THEN** ...`.
> 3. **Software Design Document (SDD):** Contexto, objetivos/no-objetivos, decisiones arquitectónicas con alternativas evaluadas, mitigación de riesgos (*[Risk] → Mitigation*) y plan de migración.
> 4. **Tasks Checklist:** Desglose secuencial de tareas de implementación organizadas por grupos numerados y listas de verificación con trazabilidad continua.

---

## **Planificación de Hitos (Fase 3)**

*   ### **[Hito 10: Motor de Internacionalización (i18n) y Localización Completa](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_10/README.md)**
    *   **Épica Relacionada (SDD & Tasks):** [Internacionalización y Soporte Multilenguaje](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_10/epica/README.md)
    *   *Objetivo OpenSpec:* Implementar el subsistema `i18n-core` con catálogos nativos en español (`es`) e inglés (`en`), resolución jerárquica por banderas, configuración y variables de entorno, localización de plantillas (`CHANGELOG`, `PAP`) y de las salidas y preguntas interactivas del CLI y Wizard.
*   ### **[Hito 11: Extractor Topológico y Análisis de Ramas y Colaboradores](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_11/README.md)**
    *   **Épica Relacionada (SDD & Tasks):** [Topología de Git y Atribución de Colaboradores](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_11/epica/README.md)
    *   *Objetivo OpenSpec:* Desarrollar el motor de análisis topológico (`git-topology-extraction`) para extraer la genealogía de ramas (bifurcaciones, puntos de unión y merges) y atribuir métricas de contribución por colaborador (`collaborator-attribution`: autores únicos, volumen de commits y scopes modificados).
*   ### **[Hito 12: Generador de Grafos en Markdown con Mermaid](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_12/README.md)**
    *   **Épica Relacionada (SDD & Tasks):** [Visualización y Trazabilidad en Markdown](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_12/epica/README.md)
    *   *Objetivo OpenSpec:* Construir el renderizador de Markdown con sintaxis Mermaid (`gitGraph` / DAG) para generar `GRAPH.md` con compatibilidad nativa para GitHub/GitLab, conmutación de granularidad dual (`dual-granularity`: modo simplificado vs detallado), tablas de colaboradores y previsualización de árbol en terminal ANSI.
*   ### **[Hito 13: Visor Gráfico Interactivo en HTML Autocontenido con Árbol de Ramas, Aislamiento de Scope y Resumen de Merges](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_13/README.md)**
    *   **Épica Relacionada (SDD & Tasks):** [Reportes Visuales Interactivos, Aislamiento de Ramas y Resúmenes de Merge](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_13/epica/README.md)
    *   *Objetivo OpenSpec:* Desarrollar la exportación del reporte visual interactivo en un archivo HTML 100% autocontenido (`zero-server-portability`: single-file bundle para abrir con doble clic sin servidor), incorporando visualización dual (`dual-visualization-tree-graph`: Commit Graph interactivo y Branch DAG Tree colapsable), modo de solo relaciones rama contra rama, aislamiento reactivo de ramas (`branch-scope-isolation`), modo de verbosidad (`verbose-commit-inclusion` para incluir commits no relevantes y cuerpos completos), resúmenes de merge estructurados estilo Git (`git-style-merge-summary`) y motor de impresión limpia (`print-export-scope` vía `@media print`).
*   ### **[Hito 14: Integración en CLI, Pipeline Unificado y Wizard Conversacional](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_14/README.md)**
    *   **Épica Relacionada (SDD & Tasks):** [Experiencia de Usuario y Flujos Integrados](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_14/epica/README.md)
    *   *Objetivo OpenSpec:* Integrar los nuevos comandos de primer nivel `tu-doc-cli graph` y `tu-doc-cli generate graph`, unificar el pipeline de ejecución y enriquecer el asistente interactivo `tu-doc-cli wizard` con flujos guiados para la parametrización de ramas y generación de grafos.

---

Para consultar los detalles de diseño, criterios de aceptación con escenarios WHEN/THEN y tareas técnicas de desarrollo de cada hito, acceda a sus respectivos enlaces superiores.
