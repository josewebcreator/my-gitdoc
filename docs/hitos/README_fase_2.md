# Índice de Hitos y Épicas - Fase 2

Este documento contiene la planificación detallada de la **Fase 2** del CLI de Documentación Automática (`tu-doc-cli`), estructurado por hitos del 6 al 9 para el equipo de desarrollo y aseguramiento de calidad.

---

## **Planificación de Hitos (Fase 2)**

*   ### **[Hito 6: Personalización, Rutas Flexibles y Verbosidad](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_6/README.md)**
    *   **Épica Relacionada:** [Configuración y Flexibilidad](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_6/epica/README.md)
    *   *Objetivo:* Implementar soporte para configuración local por proyecto (`.gitdocrc.json`), flags de personalización de salida (`--output`, `--template`) y modo verboso (`--verbose`) para incluir los cuerpos de los commits en el Changelog.
*   ### **[Hito 7: PAP Enriquecido y Trazabilidad Remota](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_7/README.md)**
    *   **Épica Relacionada:** [Enriquecimiento de Entregables e Integración Remota](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_7/epica/README.md)
    *   *Objetivo:* Modificar la estructura del PAP para separar pasos de ejecución/migraciones, planes de marcha atrás (rollback), impacto y pruebas de humo. Generar automáticamente hipervínculos a GitHub/GitLab para hashes de commits y referencias a incidencias (`#123`).
*   ### **[Hito 8: Interfaz Interactiva y Wizard CLI](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_8/README.md)**
    *   **Épica Relacionada:** [Interactividad y Wizard de Consola](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_8/epica/README.md)
    *   *Objetivo:* Incorporar el comando `wizard` para asistir de forma conversacional al usuario en la creación de su configuración y compilación de entregables.
*   ### **[Hito 9: Escalabilidad y Procesamiento de Alto Rendimiento](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_9/README.md)**
    *   **Épica Relacionada:** [Procesamiento por Streams](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_9/epica/README.md)
    *   *Objetivo:* Refactorizar la extracción y parseo semántico para utilizar iteradores asíncronos o streams, optimizando el consumo de memoria Heap en repositorios masivos o monorepos.

---

Para consultar los detalles de diseño, criterios de aceptación y tareas técnicas de desarrollo de cada hito, acceda a sus respectivos enlaces superiores.
