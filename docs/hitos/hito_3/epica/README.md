# Épica 3: Motor de Validación Estática (Linter de Negocio)

Esta épica agrupa las tareas técnicas de filtrado y linter aplicados a los commits antes de ser renderizados.

## **Archivos Involucrados**
*   [config/rules.json](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/config/rules.json) - Configuración del diccionario de negocio y listas de tipos.
*   [src/linter.js](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/src/linter.js) - Script de ejecución de reglas y chequeos léxicos.

---

## **Tareas de Desarrollo**
*   [ ] Implementar la carga y lectura de [rules.json](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/config/rules.json).
*   [ ] Escribir validaciones de obligatoriedad para los campos de commit: `type` y `subject`.
*   [ ] Escribir la validación de pertenencia de tipos en base a los `allowedTypes`.
*   [ ] Implementar una búsqueda con expresiones regulares o evaluación de texto insensible a mayúsculas para las llaves del objeto `forbiddenTerms`.
*   [ ] En caso de detectar una anomalía, retornar un reporte detallando el error y la sugerencia de reemplazo:
    ```json
    {
      "valid": false,
      "errors": [
        "El commit contiene el término prohibido 'fraude'. Sugerencia: use 'riesgoso' en su lugar."
      ]
    }
    ```
*   [ ] Acoplar la lógica del linter en la ejecución global del CLI para interrumpir el pipeline si algún commit es inválido.
