# Especificación del Proyecto: CLI de Documentación Automática

## 1. Objetivo Principal

Crear una herramienta de línea de comandos (CLI) de ejecución manual que automatice la creación de documentación de software (**CHANGELOGs**, **PAPs** y **Release Notes**). Actuará procesando el historial de Git estrictamente bajo el estándar *Conventional Commits*, sin depender de IA, apoyándose en scripts deterministas de extracción, parseo y validación estática.

---

## 2. Stack Tecnológico Definido

*   **Entorno:** Node.js usando JavaScript puro (sin compilación previa).
*   **Manejo de Módulos:** ES Modules (`"type": "module"`).
*   **Distribución:** Ejecutable global mediante `npx` (definido vía `"bin"` en el `package.json`).
*   **Dependencias Core:**
    *   `commander`: Estructuración de comandos y flags en la terminal.
    *   `simple-git`: Lectura de los logs de repositorios locales.
    *   `conventional-commits-parser`: Desestructuración de los mensajes de commit en objetos legibles.
    *   `handlebars` (o `EJS`): Motor para inyectar los datos en plantillas Markdown (`.md`).
    *   `chalk` / `picocolors`: Feedback visual (colores) en la terminal.

---

## 3. Arquitectura del Flujo de Datos (Pipeline)

El CLI ejecutará un proceso en **4 fases** cada vez que sea invocado:

1.  **Extracción:** Lectura del rango de commits (ej. desde el último Tag hasta `HEAD`).
2.  **Parseo y Mapeo:** Transformación de texto plano a formato JSON, separando `type` (`feat`, `fix`), `scope`, `subject` y `body`.
3.  **Linter de Negocio (El Filtro):** Los scripts barren el texto buscando anomalías. Si se detecta un commit rompiendo reglas de dominio (por ejemplo, registrar cambios en un módulo usando el término *"fraude"* en lugar de *"riesgoso"*), el CLI detiene el proceso y exige la corrección antes de documentar.
4.  **Agrupación y Renderizado:** Clasificación de los commits válidos (ignorando el ruido como `chore` o `style`), destacando los *Breaking Changes* y renderizando el archivo final.

---

## 4. Estructura de Comandos Inicial (MVP)

### Comando Base
```bash
tu-doc-cli generate [tipo]
```

### Variantes (`tipo`)
*   `changelog`: Agrupación general por versión.
*   `pap`: Agrupación arquitectónica filtrada por módulos.

### Banderas (Flags)
*   `--desde [tag/commit]`: Punto de inicio personalizado.
*   `--scope [nombre]`: Aísla la documentación a un solo módulo.
*   `--dry-run`: Prueba de salida en consola sin modificar archivos físicos.

---

## 5. Próximos Pasos (Ruta de Acción)

*   [ ] Crear el directorio del proyecto y ejecutar `npm init -y`.
*   [ ] Configurar el `package.json` con `"type": "module"` y el apartado `"bin"`.
*   [ ] Crear `index.js` con el shebang (`#!/usr/bin/env node`) e inicializar `commander`.
*   [ ] Ejecutar `npm link` localmente para habilitar las pruebas en terminal.
*   [ ] Desarrollar el primer script de prueba que use `simple-git` para extraer un log y lo imprima en consola.