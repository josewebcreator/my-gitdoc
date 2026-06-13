# Épica 2: Extracción y Parseo Semántico de Git

Esta épica abarca las tareas técnicas para leer el historial de Git e integrar el parser convencional de commits.

## **Archivos Involucrados**
*   [src/git.js](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/src/git.js) - Lógica de extracción mediante `simple-git`.
*   [src/parser.js](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/src/parser.js) - Conversión del log de Git a objetos JSON legibles.

---

## **Tareas de Desarrollo**
*   [x] Importar `simple-git` e inicializar el repositorio local.
*   [x] Validar que el directorio actual sea un repositorio Git (si no lo es, lanzar un error claro, imprimir en rojo y salir con código `1`).
*   [x] Validar que existan commits en el repositorio (si el historial está vacío, abortar la ejecución con código `1` y error en rojo).
*   [x] Implementar la búsqueda del último tag git usando `git.tags()`.
*   [x] Validar que las referencias (tag/commit/rama) provistas en `--from` o `--to` (si se usan) existan realmente en el historial (si no existen, abortar con error en rojo y código `1`).
*   [x] Escribir la consulta de logs construyendo los argumentos del rango de commits (ej. `[from, to]`).
*   [x] Retornar la lista raw con propiedades mínimas: hash e inspectMessage.
*   [x] Integrar `conventional-commits-parser` en [parser.js](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/src/parser.js) para tokenizar los strings de los commits.
*   [x] Mapear el output a la estructura definida de objetos:
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
