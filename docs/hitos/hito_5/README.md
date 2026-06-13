# Hito 5: Suite de Pruebas y Control de Calidad

Este hito establece las bases de pruebas unitarias y de integración continua del proyecto para garantizar su estabilidad y facilidad de mantenimiento.

## **Descripción General**
Desarrollar una cobertura completa sobre las piezas críticas de la arquitectura (Linter, Parser, Extractor) simulando entradas de Git y evaluando códigos de salida de proceso y flujos en consola.

---

## **Criterios de Aceptación**
1.  **Pruebas Unitarias del Parser y Linter:** Pruebas dedicadas con mocks y assertions sobre todas las variantes de commits válidos e inválidos.
2.  **Mocking de Git:** Las pruebas del módulo `git.js` deben correr sin depender de una terminal real de Git activa o del historial del repositorio físico, utilizando mocks de la base de datos de commits.
3.  **Ejecución Rápida:** La suite de pruebas debe ejecutarse rápidamente usando el runner nativo de Node.js (`node --test`).
4.  **Cobertura de Casos Extremos:** Verificación del linter ante inputs nulos, tipos inexistentes, mayúsculas/minúsculas mezcladas en palabras prohibidas.

---

## **Detalle de Épica Asociada**
El trabajo técnico específico y las tareas del hito se describen en la subcarpeta del hito:
*   [Épica 5: Suite de Pruebas y Control de Calidad](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_5/epica/README.md)
