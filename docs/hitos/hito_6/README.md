# Hito 6: Personalización, Rutas Flexibles y Verbosidad

Este hito introduce la flexibilidad de configuración local por proyecto y la personalización de los archivos generados y sus contenidos.

## **Descripción General**
Desarrollar el soporte para un archivo de configuración local `.gitdocrc.json` que permita modular las reglas de validación en cada proyecto individual. Adicionalmente, implementar banderas en la línea de comandos para cambiar dinámicamente la ruta del archivo de salida, cargar plantillas Handlebars personalizadas y activar el modo verboso en el Changelog.

---

## **Criterios de Aceptación**
1.  **Configuración `.gitdocrc.json`:** Si existe en la raíz, el CLI cargará este archivo combinando y sobrescribiendo sus valores sobre `config/rules.json`.
2.  **Ruta de Salida (`--output` / `-o`):** El CLI debe escribir el archivo resultante en la ruta provista por el usuario, creando directorios intermedios de ser necesario.
3.  **Plantillas Externas (`--template` / `-t`):** El renderizador debe cargar el archivo `.hbs` suministrado en la bandera en lugar del predeterminado.
4.  **Changelog Verboso (`--verbose` / `-v`):** Al usarse, el renderizador inyectará el `body` de cada commit válido justo debajo de su respectiva entrada en el Changelog, estructurado de forma legible.

---

## **Detalle de Épica Asociada**
El trabajo técnico detallado está disponible en:
*   [Épica 6: Configuración y Flexibilidad](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/docs/hitos/hito_6/epica/README.md)
