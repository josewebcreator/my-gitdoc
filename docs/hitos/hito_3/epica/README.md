# Épica 3: Motor de Validación Estática (Linter de Negocio)

Esta épica agrupa las tareas técnicas de filtrado y linter aplicados a los commits antes de ser renderizados.

## **Archivos Involucrados**
*   [config/rules.json](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/config/rules.json) - Configuración del diccionario de negocio y listas de tipos.
*   [src/linter.js](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/src/linter.js) - Script de ejecución de reglas y chequeos léxicos.

---

## **Tareas de Desarrollo**
*   [x] Implementar la carga y lectura de [rules.json](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/config/rules.json).
*   [x] Escribir validaciones de obligatoriedad para los campos de commit: `type` y `subject`.
*   [x] Escribir la validación de pertenencia de tipos en base a los `allowedTypes`.
*   [x] Implementar una búsqueda con expresiones regulares o evaluación de texto insensible a mayúsculas para las llaves del objeto `forbiddenTerms`.
*   [x] En caso de detectar una anomalía, retornar un reporte detallando el error y la sugerencia de reemplazo:
    ```json
    {
      "valid": false,
      "errors": [
        "El commit contiene el término prohibido 'fraude'. Sugerencia: use 'riesgoso' en su lugar."
      ]
    }
    ```
*   [x] Acoplar la lógica del linter en la ejecución global del CLI para interrumpir el pipeline si algún commit es inválido.

---

> ✅ **Hito 3 completado** — `feat/linter-engine` | Commit: `e153cf4` | Tests: 23/23 ✔
