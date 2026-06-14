# Épica 7: Enriquecimiento de Entregables e Integración Remota

Esta épica coordina las tareas técnicas de regex-parsing en cuerpos de commits, estructuración avanzada del reporte PAP e integración de hipervínculos a repositorios remotos.

## **Archivos Involucrados**
*   `src/renderer.js` - Lógica de agrupación de PAP y autolinking.
*   `templates/pap.hbs` - Estructura enriquecida del PAP en Handlebars.
*   `tests/unit/renderer.test.js` - Pruebas de hipervínculos e instrucciones parseadas.

---

## **Tareas de Desarrollo**
*   [ ] Diseñar la lógica de expresiones regulares en `renderer.js` para extraer las líneas de texto asociadas a directivas técnicas de despliegue en el cuerpo (`body`) del commit:
    *   `RUN:` o `MIGRATE:` para la sección de Ejecución.
    *   `ROLLBACK:` para el plan de marcha atrás.
    *   `VERIFY:` para las pruebas de humo/verificación.
*   [ ] Refactorizar `groupForPap` en `renderer.js` para que retorne los arreglos estructurados por componentes con sus respectivas secciones técnicas y comandos.
*   [ ] Modificar la plantilla `templates/pap.hbs` para plasmar la nueva jerarquía de secciones técnicas en español.
*   [ ] Implementar la función auxiliar `generateRemoteLinks(text, remoteUrl)` en el motor de renderizado para reemplazar ocurrencias de hashes y patrones `#\d+` por sus respectivos enlaces de Markdown.
*   [ ] Incorporar la vinculación automática de links en los subjects de las secciones del Changelog y el PAP.
*   [ ] Escribir escenarios de prueba dedicados en `renderer.test.js` para validar el parseo de comandos en el cuerpo y el autolinking remoto.
