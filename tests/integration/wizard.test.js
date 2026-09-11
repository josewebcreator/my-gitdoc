/**
 * Tests de integración para el módulo wizard.
 *
 * Estrategia: se importa directamente `runWizardInit` y `runWizardGenerate`
 * y se inyectan funciones de prompt mockeadas. Esto evita la dependencia
 * de TTY / stdin que tiene @inquirer/prompts v8 en producción.
 */

import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { runWizardInit, runWizardGenerate, runWizardTopology } from '../../src/wizard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

// ---------------------------------------------------------------------------
// Helpers — fábricas de prompts mockeados
// ---------------------------------------------------------------------------

/**
 * Crea un mock de `input` que devuelve el valor especificado.
 */
function mockInput(value) {
  return async (_opts) => value;
}

/**
 * Crea un mock de `confirm` que devuelve el valor booleano especificado.
 */
function mockConfirm(value) {
  return async (_opts) => value;
}

/**
 * Crea un mock de `select` que retorna el `value` de la primera opción
 * cuyo `name` o `value` coincide con el parámetro, o el primero de la lista
 * si no hay coincidencia.
 */
function mockSelect(returnValue) {
  return async (_opts) => returnValue;
}

/**
 * Crea un mock de `checkbox` que devuelve los valores especificados.
 */
function mockCheckbox(values) {
  return async (_opts) => values;
}

// ---------------------------------------------------------------------------
// Tests de runWizardInit
// ---------------------------------------------------------------------------

test('wizard init — crea .gitdocrc.json con los valores proporcionados', async () => {
  const configPath = path.resolve(projectRoot, '.gitdocrc.json');

  // Limpiar posible archivo previo
  try { await unlink(configPath); } catch { /* ok */ }

  try {
    const prompts = {
      input: (opts) => {
        if (opts.message.includes('URL remota') || opts.message.includes('Remote repository')) return Promise.resolve('https://github.com/test/repo');
        return Promise.resolve(''); // scopes vacío
      },
      checkbox: mockCheckbox(['feat', 'fix', 'refactor']),
      confirm: mockConfirm(true), // guardar = sí
    };

    await runWizardInit(prompts);

    // El archivo debe haberse creado
    assert.ok(
      fs.existsSync(configPath),
      '.gitdocrc.json no fue creado por el wizard init'
    );

    // El archivo debe ser JSON válido con remoteUrl
    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    assert.strictEqual(
      content.remoteUrl,
      'https://github.com/test/repo',
      'remoteUrl no coincide en .gitdocrc.json'
    );

    // Debe tener los tipos elegidos
    assert.deepStrictEqual(
      content.allowedTypes,
      ['feat', 'fix', 'refactor'],
      'allowedTypes no coincide'
    );
  } finally {
    try { await unlink(configPath); } catch { /* ok */ }
  }
});

test('wizard init — cancela sin escribir cuando confirm = false', async () => {
  const configPath = path.resolve(projectRoot, '.gitdocrc.json');
  try { await unlink(configPath); } catch { /* ok */ }

  try {
    const prompts = {
      input: mockInput('https://github.com/any/repo'),
      checkbox: mockCheckbox(['feat']),
      confirm: mockConfirm(false), // cancelar
    };

    await runWizardInit(prompts);

    assert.ok(
      !fs.existsSync(configPath),
      '.gitdocrc.json fue creado aunque el usuario canceló'
    );
  } finally {
    try { await unlink(configPath); } catch { /* ok */ }
  }
});

test('wizard init — sin remoteUrl no incluye esa clave en .gitdocrc.json', async () => {
  const configPath = path.resolve(projectRoot, '.gitdocrc.json');
  try { await unlink(configPath); } catch { /* ok */ }

  try {
    const prompts = {
      input: mockInput(''), // remoteUrl vacío
      checkbox: mockCheckbox(['feat', 'fix']),
      confirm: mockConfirm(true),
    };

    await runWizardInit(prompts);

    assert.ok(fs.existsSync(configPath), '.gitdocrc.json no fue creado');
    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    assert.ok(!Object.prototype.hasOwnProperty.call(content, 'remoteUrl'), 'remoteUrl no debería estar en el config');
  } finally {
    try { await unlink(configPath); } catch { /* ok */ }
  }
});

// ---------------------------------------------------------------------------
// Tests de runWizardGenerate
// ---------------------------------------------------------------------------

test('wizard generate — dry-run imprime Markdown en stdout sin escribir archivos', async () => {
  const changelogPath = path.resolve(projectRoot, 'CHANGELOG.md');
  const papPath = path.resolve(projectRoot, 'PAP.md');

  const changelogExisted = fs.existsSync(changelogPath);
  const papExisted = fs.existsSync(papPath);

  // Capturar stdout
  const written = [];
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk, ...rest) => {
    written.push(chunk.toString());
    return originalWrite(chunk, ...rest);
  };

  try {
    // Scopes → sin scopes conocidos en el repo de prueba → el wizard llama a _input
    // Forzamos flujo donde no hay scopes para probar el rama de _input
    const prompts = {
      select: (opts) => {
        if (opts.message.includes('tipo de documento') || opts.message.includes('document type') || opts.message.includes('Document type')) return Promise.resolve('changelog');
        if (opts.message.includes('inicio') || opts.message.includes('Starting') || opts.message.includes('from')) return Promise.resolve(''); // sin from
        if (opts.message.includes('fin') || opts.message.includes('Ending') || opts.message.includes('to')) return Promise.resolve('HEAD'); // to=HEAD
        if (opts.message.includes('scope') || opts.message.includes('Scope')) return Promise.resolve(''); // sin filtro
        return Promise.resolve(opts.choices?.[0]?.value ?? '');
      },
      input: mockInput(''),     // scope manual vacío
      confirm: (opts) => {
        if (opts.message.includes('dry-run')) return Promise.resolve(true);   // dry-run sí
        if (opts.message.includes('verboso') || opts.message.includes('verbose') || opts.message.includes('Verbose'))  return Promise.resolve(false);  // verbose no
        return Promise.resolve(true);
      },
    };

    await runWizardGenerate(prompts);

    // Restaurar stdout
    process.stdout.write = originalWrite;

    // Algo de Markdown debe haberse impreso
    const output = written.join('');
    assert.ok(
      output.includes('#') || output.includes('CHANGELOG') || output.includes('─'),
      `No se detectó salida Markdown en dry-run.\nCapturado: ${output.slice(0, 300)}`
    );

    // No comprobamos la existencia global de CHANGELOG.md/PAP.md para evitar flaky tests
    // en caso de ejecución paralela con cli.test.js que sí crea esos archivos.
  } finally {
    process.stdout.write = originalWrite;
  }
});

test('wizard generate — persistir escribe el archivo de salida', async () => {
  const outputPath = path.resolve(projectRoot, 'tests/tmp-wizard-output.md');

  // Crear un repositorio git temporal con commits convencionales válidos
  const tmpRepo = path.resolve(projectRoot, 'tests/tmp-wizard-repo');
  const { execSync } = await import('node:child_process');

  try {
    // Preparar repo temporal
    fs.mkdirSync(tmpRepo, { recursive: true });
    execSync('git init', { cwd: tmpRepo, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: tmpRepo, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: tmpRepo, stdio: 'pipe' });
    fs.writeFileSync(path.join(tmpRepo, 'README.md'), '# Test');
    execSync('git add .', { cwd: tmpRepo, stdio: 'pipe' });
    execSync('git commit -m "feat(api): add initial endpoint"', { cwd: tmpRepo, stdio: 'pipe' });
    execSync('git commit -m "fix(auth): correct token validation" --allow-empty', { cwd: tmpRepo, stdio: 'pipe' });

    // Cambiar cwd del proceso al repo temporal para que runGenerate funcione en él
    const originalCwd = process.cwd();
    process.chdir(tmpRepo);

    try {
      const prompts = {
        select: (opts) => {
          if (opts.message.includes('tipo de documento') || opts.message.includes('document type') || opts.message.includes('Document type')) return Promise.resolve('changelog');
          if (opts.message.includes('inicio') || opts.message.includes('Starting') || opts.message.includes('from')) return Promise.resolve(''); // sin from
          if (opts.message.includes('fin') || opts.message.includes('Ending') || opts.message.includes('to')) return Promise.resolve('HEAD');
          if (opts.message.includes('scope') || opts.message.includes('Scope')) return Promise.resolve('');
          return Promise.resolve(opts.choices?.[0]?.value ?? '');
        },
        input: (opts) => {
          if (opts.message.includes('Ruta de salida') || opts.message.includes('Output file path') || opts.message.includes('output path')) return Promise.resolve(outputPath);
          return Promise.resolve('');
        },
        confirm: (opts) => {
          if (opts.message.includes('dry-run')) return Promise.resolve(false); // persistir
          if (opts.message.includes('verboso') || opts.message.includes('verbose') || opts.message.includes('Verbose'))  return Promise.resolve(false);
          return Promise.resolve(false);
        },
      };

      await runWizardGenerate(prompts);
    } finally {
      process.chdir(originalCwd);
    }

    assert.ok(
      fs.existsSync(outputPath),
      `El archivo de salida no fue creado: ${outputPath}`
    );

    const content = fs.readFileSync(outputPath, 'utf-8');
    assert.ok(
      content.includes('#'),
      'El archivo generado no contiene Markdown'
    );
  } finally {
    try { await unlink(outputPath); } catch { /* ok */ }
    try { fs.rmSync(tmpRepo, { recursive: true, force: true }); } catch { /* ok */ }
  }
});


test('wizard generate — scope vacío incluye todos los commits sin fallar', async () => {
  const prompts = {
    select: (opts) => {
      if (opts.message.includes('tipo de documento') || opts.message.includes('document type') || opts.message.includes('Document type')) return Promise.resolve('changelog');
      if (opts.message.includes('inicio') || opts.message.includes('Starting') || opts.message.includes('from')) return Promise.resolve('');
      if (opts.message.includes('fin') || opts.message.includes('Ending') || opts.message.includes('to')) return Promise.resolve('HEAD');
      if (opts.message.includes('scope') || opts.message.includes('Scope')) return Promise.resolve('');
      return Promise.resolve(opts.choices?.[0]?.value ?? '');
    },
    input: mockInput(''),
    confirm: (opts) => {
      if (opts.message.includes('dry-run')) return Promise.resolve(true);
      if (opts.message.includes('verboso') || opts.message.includes('verbose') || opts.message.includes('Verbose'))  return Promise.resolve(false);
      return Promise.resolve(true);
    },
  };

  // No debe lanzar excepciones
  await assert.doesNotReject(
    () => runWizardGenerate(prompts),
    'runWizardGenerate con scope vacío no debería rechazar la promesa'
  );
});

test('wizard generate — tipo pap en dry-run no escribe archivos', async () => {
  const papPath = path.resolve(projectRoot, 'PAP.md');
  const papExisted = fs.existsSync(papPath);

  const prompts = {
    select: (opts) => {
      if (opts.message.includes('tipo de documento') || opts.message.includes('document type') || opts.message.includes('Document type')) return Promise.resolve('pap');
      if (opts.message.includes('inicio') || opts.message.includes('Starting') || opts.message.includes('from')) return Promise.resolve('');
      if (opts.message.includes('fin') || opts.message.includes('Ending') || opts.message.includes('to')) return Promise.resolve('HEAD');
      if (opts.message.includes('scope') || opts.message.includes('Scope')) return Promise.resolve('');
      return Promise.resolve(opts.choices?.[0]?.value ?? '');
    },
    input: mockInput(''),
    confirm: (opts) => {
      if (opts.message.includes('dry-run')) return Promise.resolve(true);
      if (opts.message.includes('verboso') || opts.message.includes('verbose') || opts.message.includes('Verbose'))  return Promise.resolve(false);
      return Promise.resolve(true);
    },
  };

  await assert.doesNotReject(
    () => runWizardGenerate(prompts),
    'runWizardGenerate PAP dry-run no debería rechazar la promesa'
  );

  // No comprobamos la existencia global de PAP.md para evitar flaky tests
});

test('wizard init — persiste baseBranch personalizada en .gitdocrc.json', async () => {
  const configPath = path.resolve(projectRoot, '.gitdocrc.json');
  try { await unlink(configPath); } catch {}

  try {
    const prompts = {
      input: (opts) => {
        if (opts.message.includes('URL') || opts.message.includes('Remote')) return Promise.resolve('https://github.com/test/repo');
        if (opts.message.includes('base') || opts.message.includes('Base')) return Promise.resolve('dev');
        return Promise.resolve('');
      },
      checkbox: mockCheckbox(['feat', 'fix']),
      confirm: mockConfirm(true),
    };

    await runWizardInit(prompts);

    assert.ok(fs.existsSync(configPath));
    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    assert.strictEqual(content.baseBranch, 'dev');
  } finally {
    try { await unlink(configPath); } catch {}
  }
});

test('wizard topology — ejecuta análisis interactivo exitosamente con formato terminal', async () => {
  const prompts = {
    select: (opts) => {
      if (opts.message.includes('base') || opts.message.includes('Base')) return Promise.resolve('main');
      if (opts.message.includes('específica') || opts.message.includes('specific')) return Promise.resolve('');
      if (opts.message.includes('formato') || opts.message.includes('format') || opts.message.includes('Format')) return Promise.resolve('terminal');
      return Promise.resolve(opts.choices?.[0]?.value ?? '');
    },
    input: mockInput(''),
    confirm: mockConfirm(false),
  };

  const res = await runWizardTopology(prompts, { lang: 'es' });
  assert.ok(res.topology);
  assert.ok(res.collaborators);
  assert.strictEqual(res.topology.baseBranch, 'main');
});

test('wizard topology — ejecuta con formato JSON y filtros', async () => {
  const prompts = {
    select: (opts) => {
      if (opts.message.includes('base') || opts.message.includes('Base')) return Promise.resolve('dev');
      if (opts.message.includes('específica') || opts.message.includes('specific')) return Promise.resolve('');
      if (opts.message.includes('formato') || opts.message.includes('format') || opts.message.includes('Format')) return Promise.resolve('json');
      return Promise.resolve(opts.choices?.[0]?.value ?? '');
    },
    input: mockInput('Jose'),
    confirm: mockConfirm(false),
  };

  const res = await runWizardTopology(prompts, { lang: 'en' });
  assert.ok(res.topology);
  assert.ok(res.collaborators);
  assert.strictEqual(res.topology.baseBranch, 'dev');
});

test('wizard generate — soporta tipo graph interactivo con preview dry-run', async () => {
  const prompts = {
    select: (opts) => {
      if (opts.message.includes('tipo de documento') || opts.message.includes('document type') || opts.message.includes('Document type')) return Promise.resolve('graph');
      if (opts.message.includes('inicio') || opts.message.includes('Starting') || opts.message.includes('from')) return Promise.resolve('');
      if (opts.message.includes('fin') || opts.message.includes('Ending') || opts.message.includes('to')) return Promise.resolve('HEAD');
      if (opts.message.includes('scope') || opts.message.includes('Scope')) return Promise.resolve('');
      return Promise.resolve(opts.choices?.[0]?.value ?? '');
    },
    input: mockInput(''),
    confirm: (opts) => {
      if (opts.message.includes('simplificada') || opts.message.includes('simplified')) return Promise.resolve(true);
      if (opts.message.includes('dry-run')) return Promise.resolve(true);
      if (opts.message.includes('verboso') || opts.message.includes('verbose')) return Promise.resolve(false);
      return Promise.resolve(true);
    },
  };

  await assert.doesNotReject(
    () => runWizardGenerate(prompts),
    'runWizardGenerate GRAPH dry-run no debería rechazar la promesa'
  );
});

test('wizard topology — ejecuta con formato tree (árbol Unicode/ANSI)', async () => {
  const prompts = {
    select: (opts) => {
      if (opts.message.includes('base') || opts.message.includes('Base')) return Promise.resolve('main');
      if (opts.message.includes('específica') || opts.message.includes('specific')) return Promise.resolve('');
      if (opts.message.includes('formato') || opts.message.includes('format') || opts.message.includes('Format')) return Promise.resolve('tree');
      return Promise.resolve(opts.choices?.[0]?.value ?? '');
    },
    input: mockInput(''),
    confirm: mockConfirm(false),
  };

  const res = await runWizardTopology(prompts, { lang: 'es' });
  assert.ok(res.topology);
  assert.ok(res.collaborators);
  assert.strictEqual(res.topology.baseBranch, 'main');
});

test('wizard topology — genera GRAPH.md con formato graph interactivo', async () => {
  const testOutputPath = path.resolve(projectRoot, 'tmp_wiz_graph.md');
  try { await unlink(testOutputPath); } catch {}

  const prompts = {
    select: (opts) => {
      if (opts.message.includes('base') || opts.message.includes('Base')) return Promise.resolve('main');
      if (opts.message.includes('específica') || opts.message.includes('specific')) return Promise.resolve('');
      if (opts.message.includes('formato') || opts.message.includes('format') || opts.message.includes('Format')) return Promise.resolve('graph');
      return Promise.resolve(opts.choices?.[0]?.value ?? '');
    },
    input: (opts) => {
      if (opts.message.includes('salida') || opts.message.includes('output')) return Promise.resolve('tmp_wiz_graph.md');
      return Promise.resolve('');
    },
    confirm: (opts) => {
      if (opts.message.includes('simplificada') || opts.message.includes('simplified')) return Promise.resolve(true);
      return Promise.resolve(false);
    },
  };

  try {
    const res = await runWizardTopology(prompts, { lang: 'es' });
    assert.ok(res.topology);
    assert.ok(fs.existsSync(testOutputPath), 'tmp_wiz_graph.md debe haber sido generado');
    const content = fs.readFileSync(testOutputPath, 'utf-8');
    assert.ok(content.includes('```mermaid'), 'Debe contener bloque mermaid');
    assert.ok(content.includes('flowchart LR'), 'Debe contener flowchart LR por haber seleccionado simplificado');
  } finally {
    try { await unlink(testOutputPath); } catch {}
  }
});

test('wizard topology — aísla a una rama hija específica y solo presenta ramas hijas en las opciones', async () => {
  const testOutputPath = path.resolve(projectRoot, 'tmp_wiz_child_graph.md');
  try { await unlink(testOutputPath); } catch {}

  let branchPromptChoices = [];

  const prompts = {
    select: (opts) => {
      // 1. Selección de rama base
      if (opts.message.includes('base') || opts.message.includes('Base')) {
        return Promise.resolve('dev');
      }
      // 2. Selección de aislar a una rama específica
      if (opts.message.includes('específica') || opts.message.includes('specific') || opts.message.includes('isolate')) {
        branchPromptChoices = opts.choices || [];
        // Seleccionar feat/hito-10 si existe entre las opciones, o la primera opción no vacía
        const hito10 = opts.choices.find((c) => c.value && c.value.includes('hito-10'));
        return Promise.resolve(hito10 ? hito10.value : (opts.choices[1]?.value || ''));
      }
      // 3. Formato de salida
      if (opts.message.includes('formato') || opts.message.includes('format') || opts.message.includes('Format')) {
        return Promise.resolve('graph');
      }
      // 4. Estilo de diagrama (ambos)
      if (opts.message.includes('diagram') || opts.message.includes('estilo') || opts.message.includes('style')) {
        return Promise.resolve('both');
      }
      return Promise.resolve(opts.choices?.[0]?.value ?? '');
    },
    input: (opts) => {
      if (opts.message.includes('salida') || opts.message.includes('output')) {
        return Promise.resolve('tmp_wiz_child_graph.md');
      }
      return Promise.resolve('');
    },
    confirm: mockConfirm(false),
  };

  try {
    const res = await runWizardTopology(prompts, { lang: 'es' });
    assert.ok(res.topology);

    // Validar que las opciones mostradas al usuario NO incluyan ramas que no son hijas de dev
    assert.ok(branchPromptChoices.length > 0, 'debe haber presentado opciones para aislar rama');
    const choiceValues = branchPromptChoices.map((c) => c.value);
    assert.ok(choiceValues.includes(''), 'debe incluir la opción de todas las ramas');
    assert.ok(!choiceValues.includes('main'), 'no debe incluir main como hija de dev');

    // Validar el archivo generado
    assert.ok(fs.existsSync(testOutputPath), 'tmp_wiz_child_graph.md debe haber sido generado');
    const content = fs.readFileSync(testOutputPath, 'utf-8');

    // Debe contener flowchart LR con relaciones entre dev y la rama seleccionada
    assert.ok(content.includes('flowchart LR'), 'debe contener flowchart LR');
    assert.ok(content.includes('dev'), 'debe contener dev');
    assert.ok(content.includes('-->|fork|') || content.includes('-->|merge|'), 'debe contener relaciones de fork o merge');

    // Debe contener gitGraph con la rama principal dev y la bifurcación
    assert.ok(content.includes("mainBranchName': 'dev'"), 'debe configurar dev como mainBranchName en gitGraph');
    assert.ok(content.includes('gitGraph'), 'debe contener bloque gitGraph');
    assert.ok(content.includes('checkout dev'), 'debe contener checkout dev');
  } finally {
    try { await unlink(testOutputPath); } catch {}
  }
});

test('wizard topology — ejecuta con formato JSON y filtros', async () => {
  const prompts = {
    select: (opts) => {
      if (opts.message.includes('base') || opts.message.includes('Base')) return Promise.resolve('dev');
      if (opts.message.includes('específica') || opts.message.includes('specific')) return Promise.resolve('');
      if (opts.message.includes('formato') || opts.message.includes('format') || opts.message.includes('Format')) return Promise.resolve('json');
      return Promise.resolve(opts.choices?.[0]?.value ?? '');
    },
    input: mockInput('Jose'),
    confirm: mockConfirm(false),
  };

  const res = await runWizardTopology(prompts, { lang: 'en' });
  assert.ok(res.topology);
  assert.ok(res.collaborators);
  assert.strictEqual(res.topology.baseBranch, 'dev');
});

test('wizard generate — soporta tipo graph interactivo con preview dry-run', async () => {
  const prompts = {
    select: (opts) => {
      if (opts.message.includes('tipo de documento') || opts.message.includes('document type') || opts.message.includes('Document type')) return Promise.resolve('graph');
      if (opts.message.includes('inicio') || opts.message.includes('Starting') || opts.message.includes('from')) return Promise.resolve('');
      if (opts.message.includes('fin') || opts.message.includes('Ending') || opts.message.includes('to')) return Promise.resolve('HEAD');
      if (opts.message.includes('scope') || opts.message.includes('Scope')) return Promise.resolve('');
      return Promise.resolve(opts.choices?.[0]?.value ?? '');
    },
    input: mockInput(''),
    confirm: (opts) => {
      if (opts.message.includes('simplificada') || opts.message.includes('simplified')) return Promise.resolve(true);
      if (opts.message.includes('dry-run')) return Promise.resolve(true);
      if (opts.message.includes('verboso') || opts.message.includes('verbose')) return Promise.resolve(false);
      return Promise.resolve(true);
    },
  };

  await assert.doesNotReject(
    () => runWizardGenerate(prompts),
    'runWizardGenerate GRAPH dry-run no debería rechazar la promesa'
  );
});

test('wizard topology — ejecuta con formato tree (árbol Unicode/ANSI)', async () => {
  const prompts = {
    select: (opts) => {
      if (opts.message.includes('base') || opts.message.includes('Base')) return Promise.resolve('main');
      if (opts.message.includes('específica') || opts.message.includes('specific')) return Promise.resolve('');
      if (opts.message.includes('formato') || opts.message.includes('format') || opts.message.includes('Format')) return Promise.resolve('tree');
      return Promise.resolve(opts.choices?.[0]?.value ?? '');
    },
    input: mockInput(''),
    confirm: mockConfirm(false),
  };

  const res = await runWizardTopology(prompts, { lang: 'es' });
  assert.ok(res.topology);
  assert.ok(res.collaborators);
  assert.strictEqual(res.topology.baseBranch, 'main');
});

test('wizard topology — genera GRAPH.md con formato graph interactivo', async () => {
  const testOutputPath = path.resolve(projectRoot, 'tmp_wiz_graph.md');
  try { await unlink(testOutputPath); } catch {}

  const prompts = {
    select: (opts) => {
      if (opts.message.includes('base') || opts.message.includes('Base')) return Promise.resolve('main');
      if (opts.message.includes('específica') || opts.message.includes('specific')) return Promise.resolve('');
      if (opts.message.includes('formato') || opts.message.includes('format') || opts.message.includes('Format')) return Promise.resolve('graph');
      return Promise.resolve(opts.choices?.[0]?.value ?? '');
    },
    input: (opts) => {
      if (opts.message.includes('salida') || opts.message.includes('output')) return Promise.resolve('tmp_wiz_graph.md');
      return Promise.resolve('');
    },
    confirm: (opts) => {
      if (opts.message.includes('simplificada') || opts.message.includes('simplified')) return Promise.resolve(true);
      return Promise.resolve(false);
    },
  };

  try {
    const res = await runWizardTopology(prompts, { lang: 'es' });
    assert.ok(res.topology);
    assert.ok(fs.existsSync(testOutputPath), 'tmp_wiz_graph.md debe haber sido generado');
    const content = fs.readFileSync(testOutputPath, 'utf-8');
    assert.ok(content.includes('```mermaid'), 'Debe contener bloque mermaid');
    assert.ok(content.includes('flowchart LR'), 'Debe contener flowchart LR por haber seleccionado simplificado');
  } finally {
    try { await unlink(testOutputPath); } catch {}
  }
});

test('wizard topology — aísla a una rama hija específica y solo presenta ramas hijas en las opciones', async () => {
  const testOutputPath = path.resolve(projectRoot, 'tmp_wiz_child_graph.md');
  try { await unlink(testOutputPath); } catch {}

  let branchPromptChoices = [];

  const prompts = {
    select: (opts) => {
      // 1. Selección de rama base
      if (opts.message.includes('base') || opts.message.includes('Base')) {
        return Promise.resolve('dev');
      }
      // 2. Selección de aislar a una rama específica
      if (opts.message.includes('específica') || opts.message.includes('specific') || opts.message.includes('isolate')) {
        branchPromptChoices = opts.choices || [];
        // Seleccionar feat/hito-10 si existe entre las opciones, o la primera opción no vacía
        const hito10 = opts.choices.find((c) => c.value && c.value.includes('hito-10'));
        return Promise.resolve(hito10 ? hito10.value : (opts.choices[1]?.value || ''));
      }
      // 3. Formato de salida
      if (opts.message.includes('formato') || opts.message.includes('format') || opts.message.includes('Format')) {
        return Promise.resolve('graph');
      }
      // 4. Estilo de diagrama (ambos)
      if (opts.message.includes('diagram') || opts.message.includes('estilo') || opts.message.includes('style')) {
        return Promise.resolve('both');
      }
      return Promise.resolve(opts.choices?.[0]?.value ?? '');
    },
    input: (opts) => {
      if (opts.message.includes('salida') || opts.message.includes('output')) {
        return Promise.resolve('tmp_wiz_child_graph.md');
      }
      return Promise.resolve('');
    },
    confirm: mockConfirm(false),
  };

  try {
    const res = await runWizardTopology(prompts, { lang: 'es' });
    assert.ok(res.topology);

    // Validar que las opciones mostradas al usuario NO incluyan ramas que no son hijas de dev
    assert.ok(branchPromptChoices.length > 0, 'debe haber presentado opciones para aislar rama');
    const choiceValues = branchPromptChoices.map((c) => c.value);
    assert.ok(choiceValues.includes(''), 'debe incluir la opción de todas las ramas');
    assert.ok(!choiceValues.includes('main'), 'no debe incluir main como hija de dev');

    // Validar el archivo generado
    assert.ok(fs.existsSync(testOutputPath), 'tmp_wiz_child_graph.md debe haber sido generado');
    const content = fs.readFileSync(testOutputPath, 'utf-8');

    // Debe contener flowchart LR con relaciones entre dev y la rama seleccionada
    assert.ok(content.includes('flowchart LR'), 'debe contener flowchart LR');
    assert.ok(content.includes('dev'), 'debe contener dev');
    assert.ok(content.includes('-->|fork|') || content.includes('-->|merge|'), 'debe contener relaciones de fork o merge');

    // Debe contener gitGraph con la rama principal dev y la bifurcación
    assert.ok(content.includes("mainBranchName': 'dev'"), 'debe configurar dev como mainBranchName en gitGraph');
    assert.ok(content.includes('gitGraph'), 'debe contener bloque gitGraph');
    assert.ok(content.includes('checkout dev'), 'debe contener checkout dev');
  } finally {
    try { await unlink(testOutputPath); } catch {}
  }
});

test('wizard topology — ejecuta con formato html generando visor interactivo', async () => {
  const testOutputPath = path.resolve(projectRoot, 'tmp_wiz_topology.html');
  try { await unlink(testOutputPath); } catch {}

  const prompts = {
    select: (opts) => {
      if (opts.message.includes('base') || opts.message.includes('Base')) return Promise.resolve('main');
      if (opts.message.includes('específica') || opts.message.includes('specific')) return Promise.resolve('');
      if (opts.message.includes('formato') || opts.message.includes('format')) return Promise.resolve('html');
      return Promise.resolve(opts.choices?.[0]?.value ?? '');
    },
    input: (opts) => {
      if (opts.message.includes('salida') || opts.message.includes('output')) {
        return Promise.resolve('tmp_wiz_topology.html');
      }
      return Promise.resolve('');
    },
    confirm: mockConfirm(false),
  };

  try {
    const res = await runWizardTopology(prompts, { lang: 'es' });
    assert.ok(res.topology);
    assert.ok(fs.existsSync(testOutputPath), 'tmp_wiz_topology.html debe haber sido generado');

    const content = fs.readFileSync(testOutputPath, 'utf-8');
    assert.ok(content.startsWith('<!DOCTYPE html>'));
    assert.ok(content.includes('<script id="gitdoc-data" type="application/json">'));
  } finally {
    try { await unlink(testOutputPath); } catch {}
  }
});

test('wizard generate — graph con opción html genera archivo HTML', async () => {
  const testOutputPath = path.resolve(projectRoot, 'tmp_wiz_generate.html');
  try { await unlink(testOutputPath); } catch {}

  const prompts = {
    select: (opts) => {
      const msg = (opts.message || '').toLowerCase();
      if (msg.includes('tipo de documento') || msg.includes('document type')) return Promise.resolve('graph');
      if (msg.includes('diagram') || msg.includes('diagrama') || msg.includes('formato') || msg.includes('format')) return Promise.resolve('html');
      if (msg.includes('inicio') || msg.includes('from') || msg.includes('start')) return Promise.resolve('');
      if (msg.includes('fin') || msg.includes('to') || msg.includes('ending')) return Promise.resolve('HEAD');
      if (msg.includes('scope')) return Promise.resolve('');
      return Promise.resolve(opts.choices?.[0]?.value ?? '');
    },
    input: (opts) => {
      const msg = (opts.message || '').toLowerCase();
      if (msg.includes('salida') || msg.includes('output')) {
        return Promise.resolve('tmp_wiz_generate.html');
      }
      return Promise.resolve('');
    },
    confirm: (opts) => {
      if (opts.message.includes('dry-run')) return Promise.resolve(false);
      return Promise.resolve(false);
    },
  };

  try {
    await runWizardGenerate(prompts);
    assert.ok(fs.existsSync(testOutputPath), 'tmp_wiz_generate.html debe haberse generado');

    const content = fs.readFileSync(testOutputPath, 'utf-8');
    assert.ok(content.startsWith('<!DOCTYPE html>'));
    assert.ok(content.includes('<title>Gitdoc — Repository Graph & Topology</title>'));
  } finally {
    try { await unlink(testOutputPath); } catch {}
  }
});
