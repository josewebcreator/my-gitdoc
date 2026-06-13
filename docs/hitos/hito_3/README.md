# Hito 3: Motor de Validación Estática - Linter

Este hito introduce el linter estático de negocio para la validación del contenido y vocabulario de los commits.

## **Descripción General**
Desarrollar un filtro lógico determinista que recorra cada commit parseado y aplique un conjunto de políticas de negocio para restringir el uso de palabras prohibidas o informales en la comunicación corporativa (como "fraude", "hack", "error estúpido", "temporal") y asegurar que el commit sea estructurado correctamente.

---

## **Criterios de Aceptación**
1.  **Validación de Estructura:** Se debe asegurar la existencia obligatoria de los campos `type` y `subject`.
2.  **Validación de Tipos de Commit:** El campo `type` debe pertenecer a la lista de tipos válidos configurados en el sistema (ej. `feat`, `fix`, `perf`, etc.).
3.  **Filtro Léxico:** Bloqueo insensible a mayúsculas de los términos prohibidos y finalización inmediata de la aplicación (`process.exit(1)`) en caso de incumplimiento.
4.  **Sugerencias Claras:** Imprimir una sugerencia explícita en consola indicando qué palabra formal reemplaza al término ofensivo.

---

## **Detalle de Épica Asociada**
El trabajo técnico específico y las tareas detalladas para alcanzar este hito están descritas en la subcarpeta de este hito:
*   [Épica 3: Motor de Validación Estática (Linter de Negocio)](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_3/epica/README.md)
