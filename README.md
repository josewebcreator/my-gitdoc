# 🚀 tu-doc-cli — CLI de Documentación Automática

`tu-doc-cli` es una herramienta de línea de comandos (CLI) diseñada para automatizar la creación de CHANGELOGs y PAPs (Procedimiento de Puesta en Producción) a partir de los commits de Git, adhiriéndose de manera estricta al estándar de **Conventional Commits**.

Desarrollada de manera 100% determinista usando **Node.js puro (ES Modules)**, esta herramienta procesa el historial local de Git mediante analizadores estáticos sin recurrir a llamadas externas de Inteligencia Artificial.

---

## 📖 Guía Rápida de Usuario (Quick Start)

### Requisitos Previos
- Node.js v18 o superior.
- Git instalado y un repositorio inicializado.

### Ejecución Directa (Recomendado)
No necesitas instalar nada globalmente. Puedes ejecutar la herramienta directamente usando `npx` en la raíz de cualquier proyecto donde quieras generar documentación:

```bash
npx tu-doc-cli wizard
```

El modo **Wizard interactivo** te guiará paso a paso de forma conversacional para configurar tu proyecto y generar la documentación sin necesidad de memorizar ningún comando.

### Instalación Global (Opcional)
Si prefieres tener el comando disponible de forma constante en tu terminal:
```bash
npm install -g tu-doc-cli
```
Luego podrás ejecutar simplemente `tu-doc-cli wizard` o `tu-doc-cli generate` directamente.

---

## 🛠️ Comandos y Uso Avanzado

### 1. Asistente Interactivo: `wizard`
La forma más amigable de utilizar el CLI. Al escribir `npx tu-doc-cli wizard`, el sistema te dará a elegir qué quieres hacer. También puedes acceder a los flujos directamente:

*   `npx tu-doc-cli wizard init`: Inicia una serie de preguntas para generar el archivo de configuración `.gitdocrc.json` a la medida de tu proyecto.
*   `npx tu-doc-cli wizard generate`: Te guía paso a paso para seleccionar el tipo de documento y elegir visualmente desde qué tag hasta qué tag quieres generarlo.

### 2. Generación Manual: `generate`
Diseñado para integraciones automatizadas (CI/CD) o usuarios avanzados que prefieren escribir todo en una línea:
```bash
npx tu-doc-cli generate <tipo> [opciones]
```

**Tipos disponibles:**
*   `changelog`: Genera el historial general de cambios para el usuario final (Release Notes).
*   `pap`: Genera el Procedimiento de Puesta en Producción estructurado con directivas de despliegue.

**Opciones principales:**

| Opción | Alias | Descripción |
| :--- | :---: | :--- |
| `--from <ref>` | | Referencia de inicio del rango (tag, hash o rama). Por defecto: último tag local. |
| `--to <ref>` | | Referencia de fin del rango. Por defecto: `HEAD`. |
| `--scope <nombre>` | | Filtra la documentación a un módulo específico del código. |
| `--output <ruta>` | `-o` | Define la ruta exacta donde se guardará el Markdown (ej. `docs/CHANGELOG.md`). |
| `--template <ruta>` | `-t` | Usa una plantilla Handlebars (`.hbs`) personalizada en lugar de la predeterminada. |
| `--verbose` | `-v` | Inyecta el cuerpo completo (`body`) de cada commit en el reporte. |
| `--dry-run` | | Simula la generación e imprime el resultado en consola sin crear ni sobreescribir archivos. |

**Ejemplos prácticos:**
```bash
# Previsualizar el CHANGELOG de la última versión
npx tu-doc-cli generate changelog --dry-run

# Generar un PAP filtrando únicamente por los commits del scope "api"
npx tu-doc-cli generate pap --scope api --output deploy/PAP.md

# Generar un CHANGELOG completo desde el inicio del historial
npx tu-doc-cli generate changelog --from HEAD~50 --to HEAD
```

---

## 🛡️ Características y Lógica de Negocio

### 1. Linter de Negocio Estricto
El CLI valida automáticamente el vocabulario de cada commit antes de generar documentación. Si algún commit no respeta Conventional Commits o contiene vocabulario corporativo prohibido, **el proceso se interrumpe con un error explicativo**.

**Términos bloqueados por defecto:** `fraude`, `hack`, `error estúpido`, `temporal`. 
El CLI te sugerirá profesionalizar el lenguaje, recomendando palabras como `riesgoso`, `mitigación`, o `ajuste de diseño`.

### 2. PAP Enriquecido con Directivas de Despliegue
El generador extrae instrucciones técnicas del cuerpo de tus commits para armar un plan de despliegue infalible. Si en el `body` de un commit agregas:
```
RUN: docker-compose -f docker-compose.prod.yml up -d
ROLLBACK: docker-compose down
VERIFY: curl -f http://localhost/health
```
El documento PAP organizará esto de manera elegante bajo las secciones **Ejecución**, **Marcha Atrás** y **Pruebas de Humo**, facilitando la vida del equipo de Operaciones e Infraestructura.

### 3. Trazabilidad Remota y Autolinking
Si defines la URL de tu repositorio remoto, el CLI analizará el texto en busca de hashes de commits (`abc1234`) y referencias a tickets (`#42`), convirtiéndolos mágicamente en hipervínculos hacia GitHub o GitLab en el Markdown final.

---

## ⚙️ Personalización (`.gitdocrc.json`)

Puedes sobreescribir las reglas del linter y el comportamiento general creando este archivo en la raíz de tu proyecto (o dejando que `npx tu-doc-cli wizard init` lo cree por ti):

```json
{
  "allowedTypes": ["feat", "fix", "docs", "chore", "refactor"],
  "forbiddenTerms": {
    "workaround": "solución documentada temporaria"
  },
  "remoteUrl": "https://github.com/josewebcreator/my-gitdoc"
}
```

---

## 📈 Estado del Proyecto (Avance)

El CLI es estable, está fuertemente testeado y listo para entornos de producción.

| Épica / Hito | Estado | Descripción |
| :--- | :---: | :--- |
| **Hitos 1 al 7: Core de Generación** | 🟢 Completado | Análisis de Git, validación estricta, motor de plantillas y autolinking. |
| **Hito 8: Wizard y Consola Interactiva** | 🟢 Completado | Control conversacional mediante el subcomando `wizard` para mejorar radicalmente la Experiencia de Usuario (UX). |
| **Hito 9: Procesamiento por Streams** | 🟡 En Progreso | Optimización del motor de lectura de Git para soportar repositorios gigantes de miles de commits manteniendo un consumo de memoria mínimo (uso de generadores asíncronos). |

---

## 🤝 Desarrollo y Contribución

Si deseas contribuir al desarrollo del propio `tu-doc-cli`, ten en cuenta las convenciones del repositorio:

1.  **Convención de Ramas:** Usa el formato `<tipo>/<descripción>` (ej. `feat/stream-processing` o `fix/linter-regex`).
2.  **Commits:** Exclusivamente en formato **Conventional Commits**.
3.  **Pruebas Unitarias e Integración (63+ Tests):**
    Asegúrate de que tus cambios no rompan la funcionalidad ejecutando el runner nativo de Node.js:
    ```bash
    npm run test
    ```
4.  **Arquitectura del Código:** 
    *   `bin/cli.js`: Punto de entrada y mapeo de rutas.
    *   `src/git.js`: Extracción de historial (Git).
    *   `src/linter.js`: Motor de reglas de negocio.
    *   `src/renderer.js`: Compilación de vistas y formateo.
    *   `src/wizard.js`: Lógica conversacional e interfaces CLI.
