# Hito 8: Interfaz Interactiva y Wizard CLI

Este hito introduce un asistente guiado e interactivo en consola para mejorar la usabilidad del CLI.

## **Descripción General**
Desarrollar un subcomando `wizard` que asista interactivamente al usuario en el proceso de configuración y generación de entregables de documentación. Utilizar diálogos en consola que permitan parametrizar los comandos, previsualizar la documentación resultante y guardar los archivos en el disco de manera intuitiva y robusta.

---

## **Criterios de Aceptación**
1.  **Comando `wizard`:** El CLI debe responder al comando `tu-doc-cli wizard` iniciando la interfaz conversacional.
2.  **Inicialización interactiva:** El wizard debe permitir crear un archivo de configuración `.gitdocrc.json` local respondiendo preguntas sobre URL remota, tipos y scopes permitidos.
3.  **Generación guiada:** El wizard guiará al usuario para seleccionar el tipo de reporte (`changelog`/`pap`), especificar scopes de filtrado, rangos de commits y si desea una simulación (`dry-run`) o persistencia.
4.  **Previsualización integrada:** Ofrecer una opción en consola para previsualizar los resultados en formato Markdown antes de guardarlos físicamente en disco.

---

## **Detalle de Épica Asociada**
El trabajo técnico detallado está disponible en:
*   [Épica 8: Interactividad y Wizard de Consola](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_8/epica/README.md)
