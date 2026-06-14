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
import { runWizardInit, runWizardGenerate } from '../../src/wizard.js';

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
        if (opts.message.includes('URL remota')) return Promise.resolve('https://github.com/test/repo');
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
        if (opts.message.includes('tipo de documento')) return Promise.resolve('changelog');
        if (opts.message.includes('inicio')) return Promise.resolve(''); // sin from
        if (opts.message.includes('fin')) return Promise.resolve('HEAD'); // to=HEAD
        if (opts.message.includes('scope')) return Promise.resolve(''); // sin filtro
        return Promise.resolve(opts.choices?.[0]?.value ?? '');
      },
      input: mockInput(''),     // scope manual vacío
      confirm: (opts) => {
        if (opts.message.includes('dry-run')) return Promise.resolve(true);   // dry-run sí
        if (opts.message.includes('verboso'))  return Promise.resolve(false);  // verbose no
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

    // No deben haberse creado archivos nuevos
    if (!changelogExisted) {
      assert.ok(!fs.existsSync(changelogPath), 'CHANGELOG.md fue creado en dry-run — no debería');
    }
    if (!papExisted) {
      assert.ok(!fs.existsSync(papPath), 'PAP.md fue creado en dry-run — no debería');
    }
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
          if (opts.message.includes('tipo de documento')) return Promise.resolve('changelog');
          if (opts.message.includes('inicio')) return Promise.resolve(''); // sin from
          if (opts.message.includes('fin')) return Promise.resolve('HEAD');
          if (opts.message.includes('scope')) return Promise.resolve('');
          return Promise.resolve(opts.choices?.[0]?.value ?? '');
        },
        input: (opts) => {
          if (opts.message.includes('Ruta de salida')) return Promise.resolve(outputPath);
          return Promise.resolve('');
        },
        confirm: (opts) => {
          if (opts.message.includes('dry-run')) return Promise.resolve(false); // persistir
          if (opts.message.includes('verboso'))  return Promise.resolve(false);
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
      if (opts.message.includes('tipo de documento')) return Promise.resolve('changelog');
      if (opts.message.includes('inicio')) return Promise.resolve('');
      if (opts.message.includes('fin')) return Promise.resolve('HEAD');
      if (opts.message.includes('scope')) return Promise.resolve('');
      return Promise.resolve(opts.choices?.[0]?.value ?? '');
    },
    input: mockInput(''),
    confirm: (opts) => {
      if (opts.message.includes('dry-run')) return Promise.resolve(true);
      if (opts.message.includes('verboso'))  return Promise.resolve(false);
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
      if (opts.message.includes('tipo de documento')) return Promise.resolve('pap');
      if (opts.message.includes('inicio')) return Promise.resolve('');
      if (opts.message.includes('fin')) return Promise.resolve('HEAD');
      if (opts.message.includes('scope')) return Promise.resolve('');
      return Promise.resolve(opts.choices?.[0]?.value ?? '');
    },
    input: mockInput(''),
    confirm: (opts) => {
      if (opts.message.includes('dry-run')) return Promise.resolve(true);
      if (opts.message.includes('verboso'))  return Promise.resolve(false);
      return Promise.resolve(true);
    },
  };

  await assert.doesNotReject(
    () => runWizardGenerate(prompts),
    'runWizardGenerate PAP dry-run no debería rechazar la promesa'
  );

  if (!papExisted) {
    assert.ok(!fs.existsSync(papPath), 'PAP.md fue creado en dry-run — no debería');
  }
});
