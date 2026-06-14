# Hito 9: Escalabilidad y Procesamiento de Alto Rendimiento

Este hito optimiza la eficiencia del sistema ante historiales masivos y grandes bases de código (monorepositorios).

## **Descripción General**
Refactorizar el flujo de lectura y procesamiento de commits (Extracción, Parseo, Linter y Agrupación) utilizando una arquitectura basada en flujos (Streams) o generadores asíncronos (`async generators`). Esto evita cargar la colección completa de commits en memoria RAM, reduciendo el footprint de memoria y previniendo caídas por desbordamiento de pila (OutOfMemory) en repositorios con más de 10,000 commits.

---

## **Criterios de Aceptación**
1.  **Footprint de Memoria Bajo:** El uso máximo de memoria Heap de Node.js durante el procesamiento de un repositorio masivo (10,000+ commits) no debe exceder los 100 MB.
2.  **Generadores Asíncronos:** Reemplazar el retorno de arrays masivos en `getCommits` en favor de un iterador asíncrono que entregue los commits por lotes pequeños o unidad por unidad.
3.  **Procesamiento por Tubería (Pipeline):** El linter y el parser deben operar sobre el iterador asíncrono, aplicando las reglas de forma secuencial "en vuelo".
4.  **Agrupación Incremental:** El motor de renderizado acumulará únicamente los commits válidos en sus respectivas estructuras agrupadas, descartando los descartables de forma inmediata para liberar memoria.

---

## **Detalle de Épica Asociada**
El trabajo técnico detallado está disponible en:
*   [Épica 9: Procesamiento por Streams](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_9/epica/README.md)
