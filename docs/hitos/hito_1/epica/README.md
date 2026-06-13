# Épica 1: Configuración Base e Interfaz de Consola (CLI)

Esta épica agrupa las tareas técnicas para construir el punto de entrada de la aplicación y la validación del comando.

## **Archivos Involucrados**
*   [package.json](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/package.json) - Configuración de dependencias y binario ejecutable.
*   [bin/cli.js](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/bin/cli.js) - Script de entrada ejecutable.

---

## **Tareas de Desarrollo**
*   [ ] Configurar y validar el shebang (`#!/usr/bin/env node`) en el archivo ejecutable.
*   [ ] Configurar la propiedad `"bin"` del `package.json` para mapear `tu-doc-cli` a [cli.js](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/bin/cli.js).
*   [ ] Inicializar `commander` configurando el nombre, la versión y la descripción del CLI.
*   [ ] Declarar el comando `generate` con el argumento `<tipo>` y los flags `--desde`, `--scope` y `--dry-run`.
*   [ ] Implementar la validación lógica del `<tipo>` en la acción del comando:
    ```javascript
    const tiposValidos = ['changelog', 'pap'];
    if (!tiposValidos.includes(tipo)) {
      console.error(colors.red(`Error: El tipo de documento "${tipo}" no es válido. Debe ser "changelog" o "pap".`));
      process.exit(1);
    }
    ```
*   [ ] Ejecutar `npm link` o `pnpm link` de manera local para validar la disponibilidad global del comando en la terminal de pruebas.
