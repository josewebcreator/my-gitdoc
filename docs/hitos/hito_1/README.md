# Hito 1: CLI Operativo con Validación Estricta

Este hito representa el punto inicial del proyecto `tu-doc-cli`, enfocándose en la infraestructura del CLI, estructuración y control inicial de parámetros de entrada.

## **Descripción General**
Desplegar la estructura del comando base, definir los comandos mediante la biblioteca `commander` y asegurar que cualquier parámetro de entrada sea validado rígidamente antes de permitir al programa continuar con el pipeline.

---

## **Criterios de Aceptación**
1.  **Comando Base:** La CLI debe responder al comando `tu-doc-cli generate <tipo>`.
2.  **Validación de Tipo:** Solo se aceptan como argumentos válidos `changelog` o `pap`.
3.  **Manejo de Errores de Entrada:** Si el usuario ingresa un tipo no soportado (ej. `tu-doc-cli generate invalid`), la ejecución se detiene inmediatamente con código de retorno `process.exit(1)`.
4.  **Feedback Visual:** El error debe reportarse en color rojo.

---

## **Detalle de Épica Asociada**
El trabajo técnico específico y las tareas detalladas para alcanzar este hito están descritas en la subcarpeta de este hito:
*   [Épica 1: Configuración Base e Interfaz de Consola (CLI)](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_1/epica/README.md)
