import test from 'node:test';
import assert from 'node:assert';
import { exec, execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runWizardInit } from '../../src/wizard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.resolve(__dirname, '../../bin/cli.js');
const projectRoot = path.resolve(__dirname, '../..');
const tmpRepo = path.resolve(projectRoot, 'tests/tmp-i18n-repo');

function setupTmpRepo() {
  if (fs.existsSync(tmpRepo)) {
    try {
      fs.rmSync(tmpRepo, { recursive: true, force: true });
    } catch {}
  }
  fs.mkdirSync(tmpRepo, { recursive: true });
  execFileSync('git', ['init'], { cwd: tmpRepo, stdio: 'pipe' });
  execFileSync('git', ['config', 'user.email', 'test@test.com'], { cwd: tmpRepo, stdio: 'pipe' });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: tmpRepo, stdio: 'pipe' });
  fs.writeFileSync(path.join(tmpRepo, 'README.md'), '# Test');
  execFileSync('git', ['add', '.'], { cwd: tmpRepo, stdio: 'pipe' });
  execFileSync('git', ['commit', '-m', 'feat(api): initial endpoint'], { cwd: tmpRepo, stdio: 'pipe' });
  execFileSync('git', ['commit', '-m', 'fix(auth): fix token validation', '--allow-empty'], { cwd: tmpRepo, stdio: 'pipe' });
  execFileSync(
    'git',
    [
      'commit',
      '-m',
      'ci(docker): add ci container',
      '-m',
      'RUN: docker compose up\nROLLBACK: docker compose down\nVERIFY: curl http://localhost',
      '--allow-empty',
    ],
    { cwd: tmpRepo, stdio: 'pipe' }
  );
}

function cleanupTmpRepo() {
  if (fs.existsSync(tmpRepo)) {
    try {
      fs.rmSync(tmpRepo, { recursive: true, force: true });
    } catch {}
  }
}

function runCli(args, cwd = tmpRepo) {
  return new Promise((resolve) => {
    const options = { cwd };
    exec(`node "${cliPath}" ${args}`, options, (error, stdout, stderr) => {
      resolve({ code: error ? error.code : 0, stdout, stderr, error });
    });
  });
}

// ---------------------------------------------------------------------------
// 1. Delta Spec: Precedencia de bandera CLI sobre configuración local
// ---------------------------------------------------------------------------

test('i18n CLI - --lang en tiene precedencia sobre locale: es en .gitdocrc.json', async () => {
  setupTmpRepo();
  try {
    const localConfigPath = path.join(tmpRepo, '.gitdocrc.json');
    fs.writeFileSync(localConfigPath, JSON.stringify({ locale: 'es' }), 'utf-8');

    const { code, stdout } = await runCli('generate changelog --lang en --dry-run');
    assert.strictEqual(code, 0, 'Exit code debe ser 0');
    assert.ok(stdout.includes('## Features'), 'Debe imprimir Features en lugar de Nuevas Características');
    assert.ok(stdout.includes('## Bug Fixes'), 'Debe imprimir Bug Fixes en lugar de Correcciones de Bugs');
  } finally {
    cleanupTmpRepo();
  }
});

// ---------------------------------------------------------------------------
// 2. Delta Spec: Localización de etiquetas del PAP en inglés
// ---------------------------------------------------------------------------

test('i18n CLI - renderiza etiquetas técnicas y títulos del PAP en inglés', async () => {
  setupTmpRepo();
  try {
    const { code, stdout } = await runCli('generate pap --lang en --dry-run');
    assert.strictEqual(code, 0, 'Exit code debe ser 0');
    assert.ok(stdout.includes('# Production Deployment Procedure (PAP)'), 'Debe incluir el título en inglés');
    assert.ok(stdout.includes('## Component: docker'), 'Debe incluir Component: en lugar de Componente:');
    assert.ok(stdout.includes('**Execution:**'), 'Debe incluir **Execution:**');
    assert.ok(stdout.includes('**Rollback:**'), 'Debe incluir **Rollback:**');
    assert.ok(stdout.includes('**Smoke Tests / Verification:**'), 'Debe incluir **Smoke Tests / Verification:**');
  } finally {
    cleanupTmpRepo();
  }
});

// ---------------------------------------------------------------------------
// 3. Delta Spec: Sobrescritura de título de sección corporativa
// ---------------------------------------------------------------------------

test('i18n CLI - sobrescribe títulos de sección vía bloque i18n en .gitdocrc.json', async () => {
  setupTmpRepo();
  try {
    const localConfigPath = path.join(tmpRepo, '.gitdocrc.json');
    const config = {
      locale: 'es',
      i18n: {
        es: {
          'sections.feat': 'Entregas de Producto',
        },
      },
    };
    fs.writeFileSync(localConfigPath, JSON.stringify(config), 'utf-8');

    const { code, stdout } = await runCli('generate changelog --dry-run');
    assert.strictEqual(code, 0, 'Exit code debe ser 0');
    assert.ok(stdout.includes('## Entregas de Producto'), 'Debe reemplazar Nuevas Características por Entregas de Producto');
  } finally {
    cleanupTmpRepo();
  }
});

// ---------------------------------------------------------------------------
// 4. Delta Spec: Incorporación de un nuevo idioma no nativo (fr)
// ---------------------------------------------------------------------------

test('i18n CLI - permite nuevo idioma no nativo (fr) declarado en .gitdocrc.json', async () => {
  setupTmpRepo();
  try {
    const localConfigPath = path.join(tmpRepo, '.gitdocrc.json');
    const config = {
      locale: 'fr',
      i18n: {
        fr: {
          'sections.feat': 'Fonctionnalités de Produit',
        },
      },
    };
    fs.writeFileSync(localConfigPath, JSON.stringify(config), 'utf-8');

    const { code, stdout } = await runCli('generate changelog --dry-run');
    assert.strictEqual(code, 0, 'Exit code debe ser 0');
    assert.ok(stdout.includes('## Fonctionnalités de Produit'), 'Debe renderizar la sección personalizada en francés');
  } finally {
    cleanupTmpRepo();
  }
});

// ---------------------------------------------------------------------------
// 5. Delta Spec: Reporte de errores de linter localizado en inglés
// ---------------------------------------------------------------------------

test('i18n CLI - reporta errores de linter en inglés cuando --lang en está activo', async () => {
  setupTmpRepo();
  try {
    execFileSync('git', ['commit', '-m', 'feat(sec): use forbidden hack term', '--allow-empty'], {
      cwd: tmpRepo,
      stdio: 'pipe',
    });

    const localConfigPath = path.join(tmpRepo, '.gitdocrc.json');
    const config = {
      forbiddenTerms: {
        hack: 'mitigation',
      },
    };
    fs.writeFileSync(localConfigPath, JSON.stringify(config), 'utf-8');

    const { code, stderr } = await runCli('generate changelog --lang en');
    assert.strictEqual(code, 1, 'Exit code debe ser 1');
    assert.ok(
      stderr.includes('❌ Business linter found invalid commits:'),
      'Debe reportar el título del error de linter en inglés'
    );
    assert.ok(
      stderr.includes('Commit contains forbidden term "hack"'),
      'Debe detallar la regla violada en inglés'
    );
  } finally {
    cleanupTmpRepo();
  }
});

// ---------------------------------------------------------------------------
// 6. Wizard Task 3.4: Pregunta de selección de idioma en runWizardInit
// ---------------------------------------------------------------------------

test('wizard init — permite seleccionar el idioma por defecto y lo persiste en .gitdocrc.json', async () => {
  setupTmpRepo();
  const originalCwd = process.cwd();
  process.chdir(tmpRepo);

  try {
    const prompts = {
      input: () => Promise.resolve(''),
      checkbox: () => Promise.resolve(['feat', 'fix']),
      select: (opts) => {
        if (opts.message.toLowerCase().includes('language') || opts.message.toLowerCase().includes('idioma')) {
          return Promise.resolve('en');
        }
        return Promise.resolve('es');
      },
      confirm: () => Promise.resolve(true),
    };

    await runWizardInit(prompts);

    const configPath = path.join(tmpRepo, '.gitdocrc.json');
    assert.ok(fs.existsSync(configPath), '.gitdocrc.json debe existir en el directorio actual');
    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    assert.strictEqual(content.locale, 'en', 'El idioma seleccionado debe haberse guardado');
  } finally {
    process.chdir(originalCwd);
    cleanupTmpRepo();
  }
});

// ---------------------------------------------------------------------------
// 7. Localización de descripciones de Commander (--help)
// ---------------------------------------------------------------------------

test('i18n CLI - descripciones de ayuda en inglés por defecto', async () => {
  setupTmpRepo();
  try {
    const { code, stdout } = await runCli('generate --help');
    assert.strictEqual(code, 0);
    assert.ok(stdout.includes('Generate a documentation report (changelog or pap)'));
    assert.ok(stdout.includes('Document type to generate (changelog or pap)'));
    assert.ok(stdout.includes('Starting tag, commit hash, or branch'));
    assert.ok(stdout.includes('Output path for the generated file'));
  } finally {
    cleanupTmpRepo();
  }
});

test('i18n CLI - descripciones de ayuda en español con --lang es', async () => {
  setupTmpRepo();
  try {
    const { code, stdout } = await runCli('generate --help --lang es');
    assert.strictEqual(code, 0);
    assert.ok(stdout.includes('Generar un reporte de documentación (changelog o pap)'));
    assert.ok(stdout.includes('Tipo de documento a generar (changelog o pap)'));
    assert.ok(stdout.includes('Referencia inicial: tag, commit hash o rama'));
    assert.ok(stdout.includes('Ruta de salida del archivo generado'));
  } finally {
    cleanupTmpRepo();
  }
});

