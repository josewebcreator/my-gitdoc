# Hito 7: PAP Enriquecido y Trazabilidad Remota

Este hito eleva el valor técnico de los entregables mediante la ampliación estructural del PAP y la conexión con plataformas de control de versiones remotas.

## **Descripción General**
Modificar el generador de PAP para parsear e inyectar detalles avanzados de despliegue (migraciones base de datos, rollback e instrucciones de verificación) a partir de secciones estructuradas en el cuerpo de los commits. Además, implementar el autolink en Markdown para commits y tickets/issues conectándose dinámicamente a la URL de hosting remoto del repositorio configurada en el `.gitdocrc.json`.

---

## **Criterios de Aceptación**
1.  **PAP Estructurado:** El entregable del PAP se debe dividir por componente/scope en cuatro secciones estructuradas si hay datos disponibles: *Impacto*, *Ejecución*, *Marcha Atrás* y *Pruebas de Humo*.
2.  **Parser de Instrucciones PAP:** Extraer las líneas de comandos que comiencen con tags semánticos en el cuerpo del commit (ej. `RUN:`, `ROLLBACK:`, `VERIFY:`) e inyectarlas de forma jerárquica en sus respectivas secciones del PAP.
3.  **Vínculos de Commits:** Si `remoteUrl` está definido en la configuración, los identificadores de commit (hash de 7 o 40 caracteres) deben convertirse en hipervínculos markdown válidos apuntando a la visualización remota de cambios del commit.
4.  **Vínculos de Issues/PRs:** Las menciones a incidencias en formato `#123` deben transformarse dinámicamente en hipervínculos a la URL de tickets del repositorio remoto.

---

## **Detalle de Épica Asociada**
El trabajo técnico detallado está disponible en:
*   [Épica 7: Enriquecimiento de Entregables e Integración Remota](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_7/epica/README.md)
