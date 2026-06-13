# Hito 2: Extracción y Parseo Semántico de Git

Este hito aborda la conexión a la base de datos de Git y el análisis estructurado de los mensajes de commits.

## **Descripción General**
Desarrollar los mecanismos para interactuar con la línea de comandos de Git de manera asíncrona, capturando el rango de commits pertinentes, y posteriormente estructurando esos mensajes mediante un parser que convierta el texto bruto a objetos JSON manipulables.

---

## **Criterios de Aceptación**
1.  **Conexión Git Estable:** La librería `simple-git` debe leer correctamente el log local sin dependencias de variables de entorno globales.
2.  **Rango de Búsqueda Flexible:** Si se pasa el flag `--desde`, el CLI debe extraer desde ese tag/commit hasta `HEAD`. Si no se pasa, debe detectar dinámicamente el último tag y extraer desde él; si no existe ningún tag, extraerá todo el historial.
3.  **Desestructuración Semántica:** Cada commit devuelto por el parser debe contener campos como `type`, `scope`, `subject`, `body`, y un arreglo de notas para cambios disruptivos (*Breaking Changes*).
4.  **Manejo de Casos Borde y Errores de Git:**
    *   **Sin Repositorio Git:** Si el directorio actual no es un repositorio Git (o no está inicializado), la ejecución debe detenerse inmediatamente con código `1` y reportar el error en rojo.
    *   **Historial Vacío:** Si el repositorio no tiene commits, reportar en rojo que no hay historial de commits y salir con código `1`.
    *   **Referencia Inexistente:** Si el tag/commit provisto en `--desde` no existe en el historial del repositorio, se debe reportar el error en rojo y salir con código `1`.

---

## **Detalle de Épica Asociada**
El trabajo técnico específico y las tareas detalladas para alcanzar este hito están descritas en la subcarpeta de este hito:
*   [Épica 2: Extracción y Parseo Semántico de Git](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_2/epica/README.md)
