# Hito 2: Extracción y Parseo Semántico de Git

Este hito aborda la conexión a la base de datos de Git y el análisis estructurado de los mensajes de commits.

## **Descripción General**
Desarrollar los mecanismos para interactuar con la línea de comandos de Git de manera asíncrona, capturando el rango de commits pertinentes, y posteriormente estructurando esos mensajes mediante un parser que convierta el texto bruto a objetos JSON manipulables.

---

## **Criterios de Aceptación**
1.  **Conexión Git Estable:** La librería `simple-git` debe leer correctamente el log local sin dependencias de variables de entorno globales.
2.  **Rango de Búsqueda Flexible:** Si se pasa el flag `--desde`, el CLI debe extraer desde ese tag/commit hasta `HEAD`. Si no se pasa, debe detectar dinámicamente el último tag y extraer desde él; si no existe ningún tag, extraerá todo el historial.
3.  **Desestructuración Semántica:** Cada commit devuelto por el parser debe contener campos como `type`, `scope`, `subject`, `body`, y un arreglo de notas para cambios disruptivos (*Breaking Changes*).

---

## **Detalle de Épica Asociada**
El trabajo técnico específico y las tareas detalladas para alcanzar este hito están descritas en la subcarpeta de este hito:
*   [Épica 2: Extracción y Parseo Semántico de Git](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_2/epica/README.md)
