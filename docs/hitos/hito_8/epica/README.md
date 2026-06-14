# Épica 8: Interactividad y Wizard de Consola

Esta épica coordina las tareas técnicas de integración de diálogos de consola interactiva, creación asistida del archivo de configuración `.gitdocrc.json` y control conversacional del pipeline.

## **Archivos Involucrados**
*   `bin/cli.js` - Definición del comando `wizard`.
*   `src/wizard.js` - Control conversacional de prompts.
*   `tests/integration/wizard.test.js` - Pruebas de integración simulando la interfaz interactiva.

---

## **Tareas de Desarrollo**
*   [x] Integrar una biblioteca interactiva de prompts ligera (como `prompts` o `inquirer`).
*   [x] Escribir el flujo de inicialización en `src/wizard.js` para crear interactivamente el archivo `.gitdocrc.json` en base al input del usuario (nombre de repo, remoteUrl, reglas extras).
*   [x] Diseñar el flujo conversacional para compilar reportes:
    *   Preguntar tipo de documento (`changelog` / `pap`).
    *   Listar tags/ramas locales existentes para seleccionar `--from` y `--to` de forma segura.
    *   Permitir introducir opcionalmente scopes y bandera de simulación (`dry-run`).
*   [x] Añadir la opción de previsualización que imprima en consola el Markdown compilado.
*   [x] Integrar el subcomando `wizard` dentro de `bin/cli.js`.
*   [x] Desarrollar pruebas que simulen la entrada de usuario en el Wizard para asegurar la robustez de los prompts ante selecciones inválidas.
