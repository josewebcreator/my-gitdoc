# Épica 2: Extracción y Parseo Semántico de Git

Esta épica abarca las tareas técnicas para leer el historial de Git e integrar el parser convencional de commits.

## **Archivos Involucrados**
*   [src/git.js](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/src/git.js) - Lógica de extracción mediante `simple-git`.
*   [src/parser.js](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/src/parser.js) - Conversión del log de Git a objetos JSON legibles.

---

## **Tareas de Desarrollo**
*   [ ] Importar `simple-git` e inicializar el repositorio local.
*   [ ] Implementar la búsqueda del último tag git usando `git.tags()`.
*   [ ] Escribir la consulta de logs construyendo los argumentos del rango de commits (ej. `[desde, 'HEAD']`).
*   [ ] Retornar la lista raw con propiedades mínimas: hash e inspectMessage.
*   [ ] Integrar `conventional-commits-parser` en [parser.js](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/src/parser.js) para tokenizar los strings de los commits.
*   [ ] Mapear el output a la estructura definida de objetos:
    ```json
    {
      "hash": "abc1234",
      "type": "feat",
      "scope": "auth",
      "subject": "add login endpoint",
      "body": "closes #45",
      "notes": []
    }
    ```
