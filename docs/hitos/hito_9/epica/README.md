# Épica 9: Procesamiento por Streams

Esta épica agrupa las tareas técnicas para rediseñar el pipeline de extracción y parseo semántico usando generadores asíncronos y optimización de memoria.

## **Archivos Involucrados**
*   `src/git.js` - Refactor a generadores de logs.
*   `src/pipeline.js` - Procesamiento en vuelo.
*   `tests/performance/memory.test.js` - Pruebas de benchmark de consumo de Heap.

---

## **Tareas de Desarrollo**
*   [ ] Rediseñar `getCommits` en `src/git.js` para que retorne un generador asíncrono (`async function*`) en lugar de esperar la resolución total del array de logs.
*   [ ] Utilizar los flujos de lectura de procesos hijo en `simple-git` o `node:child_process` para procesar la salida de Git línea por línea a medida que se emite.
*   [ ] Actualizar `pipeline.js` para consumir el generador de commits, aplicando en vuelo el parseo semántico y la validación del linter.
*   [ ] Asegurar que el linter interrumpa el stream inmediatamente ante la detección de un error de negocio crítico, evitando seguir procesando el resto del log.
*   [ ] Desarrollar una suite de pruebas de rendimiento (`tests/performance/memory.test.js`) que simule un log de 10,000 commits y mida el Heap de Node.js mediante `process.memoryUsage().heapUsed`, asegurando que se mantiene por debajo de 100 MB.
