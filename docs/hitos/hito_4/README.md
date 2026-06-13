# Hito 4: Agrupación, Renderizado y Generación

Este hito define la transformación final de los commits válidos en entregables legibles en formato Markdown.

## **Descripción General**
Desarrollar el motor para filtrar y estructurar los commits dependiendo del tipo de reporte (`changelog` o `pap`). Posteriormente, inyectar los datos en plantillas Handlebars preconfiguradas para finalmente persistir los resultados en archivos físicos Markdown o imprimirlos en consola mediante simulación.

---

## **Criterios de Aceptación**
1.  **Filtro y Agrupación Changelog:** Solo se incluyen commits `feat`, `fix`, `perf` o `refactor`. Se organizan en secciones dedicadas y se priorizan de forma destacable los *Breaking Changes*.
2.  **Filtro y Agrupación PAP:** Solo se incluyen commits `ci`, `build` o que toquen archivos de ambiente e infraestructura (filtrados por scopes como `db`, `infra`, `docker`, `config`). Se agrupan bajo los nombres de sus respectivos scopes.
3.  **Filtrado por Scope:** Si se provee la bandera `--scope`, se limita el renderizado solo a los commits correspondientes a dicho scope.
4.  **Simulación de Operación:** La bandera `--dry-run` debe escribir en `process.stdout` en lugar de generar archivos físicos.

---

## **Detalle de Épica Asociada**
El trabajo técnico específico y las tareas detalladas para alcanzar este hito están descritas en la subcarpeta de este hito:
*   [Épica 4: Agrupación, Renderizado y Generación de Reportes](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_4/epica/README.md)
