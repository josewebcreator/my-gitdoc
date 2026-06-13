# Épica 5: Suite de Pruebas y Control de Calidad

Esta épica agrupa las tareas técnicas orientadas a la suite de pruebas unitarias y de integración del proyecto.

## **Archivos Involucrados**
*   [tests/unit/parser.test.js](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/tests/unit/parser.test.js) - Pruebas del módulo parser.
*   `tests/unit/linter.test.js` - Pruebas del módulo linter.
*   `tests/integration/cli.test.js` - Pruebas de integración del CLI.

---

## **Tareas de Desarrollo**
*   [ ] Reemplazar el test placeholder en [parser.test.js](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/tests/unit/parser.test.js) con aserciones reales usando el parser sobre mensajes válidos de commit.
*   [ ] Crear `tests/unit/linter.test.js` para probar que el linter apruebe tipos permitidos y rechace adecuadamente palabras prohibidas en mayúsculas/minúsculas.
*   [ ] Escribir una prueba de integración que ejecute programáticamente el comando con argumentos inválidos y verifique que retorne un código de estado `1`.
*   [ ] Configurar mocks eficientes para el módulo [git.js](file:///c:/Users/User/Desktop/Laboratorio/gitdoc/src/git.js) simulando respuestas predefinidas de logs de Git.
*   [ ] Validar que el script `test` en el `package.json` ejecute de forma recursiva todos los archivos `.test.js` dentro del directorio `tests/`.
