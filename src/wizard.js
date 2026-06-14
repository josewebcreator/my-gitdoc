import { writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { select, checkbox, input, confirm } from '@inquirer/prompts';
import { simpleGit } from 'simple-git';
import { runGenerate } from './pipeline.js';
import { renderDocument } from './renderer.js';
import { getCommits } from './git.js';
import { parseCommit } from './parser.js';
import pc from 'picocolors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Obtiene las ramas y tags locales del repositorio git actual.
 * Devuelve un array de strings con las referencias disponibles.
 */
async function getGitRefs() {
  try {
    const git = simpleGit();
    const [branchResult, tagResult] = await Promise.all([
      git.branchLocal(),
      git.tags(),
    ]);
    const branches = branchResult.all || [];
    const tags = tagResult.all || [];
    return [...new Set(['HEAD', ...tags, ...branches])];
  } catch {
    return ['HEAD'];
  }
}

/**
 * Obtiene los scopes únicos presentes en los commits del rango actual.
 */
async function getKnownScopes(from, to) {
  try {
    const scopes = [];
    for await (const c of getCommits({ from, to })) {
      const scope = parseCommit(c.inspectMessage).scope;
      if (scope) scopes.push(scope);
    }
    return [...new Set(scopes)];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Flujo 1: Inicialización — crea/actualiza .gitdocrc.json
// ---------------------------------------------------------------------------

/**
 * Guía al usuario de forma interactiva para crear un archivo `.gitdocrc.json`
 * con la configuración básica del proyecto.
 *
 * @param {object} [prompts] - Inyección de dependencias de prompts (para testing).
 *   Si no se provee, se usan los prompts reales de @inquirer/prompts.
 */
export async function runWizardInit(prompts = {}) {
  const _input    = prompts.input    ?? input;
  const _checkbox = prompts.checkbox ?? checkbox;
  const _confirm  = prompts.confirm  ?? confirm;

  console.log(pc.cyan('\n🔧  Wizard de inicialización — Configuración del proyecto\n'));

  const configPath = resolve(process.cwd(), '.gitdocrc.json');
  let existingConfig = {};
  if (existsSync(configPath)) {
    try {
      existingConfig = JSON.parse(await readFile(configPath, 'utf-8'));
      console.log(pc.yellow('⚠  Se encontró un archivo .gitdocrc.json existente. Los valores actuales se mostrarán como default.\n'));
    } catch {
      // ignorar errores de parseo
    }
  }

  // --- Preguntas ---

  const remoteUrl = await _input({
    message: 'URL remota del repositorio (para autolinking de commits/issues):',
    default: existingConfig.remoteUrl || '',
  });

  const KNOWN_TYPES = ['feat', 'fix', 'perf', 'refactor', 'docs', 'style', 'test', 'build', 'ci', 'chore', 'revert'];
  const allowedTypesAnswer = await _checkbox({
    message: 'Tipos de commit permitidos en este proyecto:',
    choices: KNOWN_TYPES.map(t => ({
      name: t,
      value: t,
      checked: existingConfig.allowedTypes
        ? existingConfig.allowedTypes.includes(t)
        : ['feat', 'fix', 'perf', 'refactor', 'docs', 'build', 'ci', 'chore'].includes(t),
    })),
  });

  const scopesRaw = await _input({
    message: 'Scopes permitidos (separados por coma, o deja vacío para no restringir):',
    default: existingConfig.allowedScopes ? existingConfig.allowedScopes.join(', ') : '',
  });

  // --- Construir objeto de configuración ---

  const config = {};
  if (remoteUrl.trim()) config.remoteUrl = remoteUrl.trim();
  if (allowedTypesAnswer.length > 0) config.allowedTypes = allowedTypesAnswer;
  if (scopesRaw.trim()) {
    config.allowedScopes = scopesRaw.split(',').map(s => s.trim()).filter(Boolean);
  }

  // Preservar otras claves que pudieran existir (ej: forbiddenTerms)
  const finalConfig = { ...existingConfig, ...config };

  const shouldWrite = await _confirm({
    message: `¿Guardar la configuración en ${pc.bold('.gitdocrc.json')}?`,
    default: true,
  });

  if (!shouldWrite) {
    console.log(pc.yellow('\n⚠  Operación cancelada. No se guardó ningún archivo.\n'));
    return;
  }

  await writeFile(configPath, JSON.stringify(finalConfig, null, 2), 'utf-8');
  console.log(pc.green(`\n✅ Archivo .gitdocrc.json guardado exitosamente.\n`));
  console.log(pc.dim(JSON.stringify(finalConfig, null, 2)));
  console.log();
}

// ---------------------------------------------------------------------------
// Flujo 2: Generación guiada — compila un reporte paso a paso
// ---------------------------------------------------------------------------

/**
 * Guía al usuario de forma interactiva para generar un reporte de documentación
 * (changelog o pap), permitiendo previsualizar o persistir el resultado.
 *
 * @param {object} [prompts] - Inyección de dependencias de prompts (para testing).
 *   Si no se provee, se usan los prompts reales de @inquirer/prompts.
 */
export async function runWizardGenerate(prompts = {}) {
  const _select  = prompts.select  ?? select;
  const _input   = prompts.input   ?? input;
  const _confirm = prompts.confirm ?? confirm;

  console.log(pc.cyan('\n📄  Wizard de generación — Compilar reporte de documentación\n'));

  // 1. Tipo de documento
  const tipo = await _select({
    message: 'Selecciona el tipo de documento a generar:',
    choices: [
      { name: 'CHANGELOG  (feat, fix, perf, refactor)', value: 'changelog' },
      { name: 'PAP        (ci, build + scopes de infraestructura)', value: 'pap' },
    ],
  });

  // 2. Rango de commits: --from / --to
  const refs = await getGitRefs();
  const refChoices = refs.map(r => ({ name: r, value: r }));

  const fromRef = await _select({
    message: 'Referencia de inicio (--from): tag, rama o HEAD:',
    choices: [{ name: '(sin inicio — desde el principio del historial)', value: '' }, ...refChoices],
  });

  const toRef = await _select({
    message: 'Referencia de fin (--to):',
    choices: refChoices,
    default: 'HEAD',
  });

  // 3. Scope filter (opcional)
  const knownScopes = await getKnownScopes(fromRef || undefined, toRef === 'HEAD' ? undefined : toRef);
  let scopeFilter = '';

  if (knownScopes.length > 0) {
    const scopeChoices = [
      { name: '(sin filtro — incluir todos los scopes)', value: '' },
      ...knownScopes.map(s => ({ name: s, value: s })),
      { name: '(escribir manualmente)', value: '__manual__' },
    ];
    const scopeAnswer = await _select({
      message: 'Filtrar por scope (opcional):',
      choices: scopeChoices,
    });
    if (scopeAnswer === '__manual__') {
      scopeFilter = await _input({ message: 'Ingresa el nombre del scope:' });
    } else {
      scopeFilter = scopeAnswer;
    }
  } else {
    const manualScope = await _input({
      message: 'Filtrar por scope (deja vacío para incluir todo):',
      default: '',
    });
    scopeFilter = manualScope.trim();
  }

  // 4. Modo: dry-run o persistir
  const isDryRun = await _confirm({
    message: '¿Previsualizar en consola sin guardar archivos? (dry-run)',
    default: true,
  });

  // 5. Nombre de archivo de salida (solo si persistir)
  let outputPath = '';
  if (!isDryRun) {
    const defaultOutput = tipo === 'changelog' ? 'CHANGELOG.md' : 'PAP.md';
    outputPath = await _input({
      message: `Ruta de salida del archivo:`,
      default: defaultOutput,
    });
  }

  // 6. Verbose
  const verbose = await _confirm({
    message: '¿Activar modo verboso? (incluye más tipos de commit)',
    default: false,
  });

  // --- Compilar opciones ---
  const options = {
    from: fromRef || undefined,
    to: toRef === 'HEAD' ? undefined : toRef,
    scope: scopeFilter || undefined,
    dryRun: isDryRun,
    output: outputPath || undefined,
    verbose,
  };

  console.log();

  if (isDryRun) {
    // Previsualización: renderizar y mostrar en consola
    try {
      const { runPipeline } = await import('./pipeline.js');
      const parsedCommits = [];
      for await (const commit of runPipeline(tipo, options)) {
        parsedCommits.push(commit);
      }
      const markdown = await renderDocument(parsedCommits, tipo, {
        scope: options.scope,
        verbose: options.verbose,
      });

      console.log(pc.yellow('⚠  Modo previsualización — no se escribirán archivos físicos.\n'));
      console.log(pc.dim('─'.repeat(60)));
      console.log(markdown);
      console.log(pc.dim('─'.repeat(60)));
    } catch (err) {
      console.error(pc.red(`\n❌ Error durante la previsualización: ${err.message}\n`));
      process.exit(1);
    }
  } else {
    // Persistir: delegar en el pipeline completo
    await runGenerate(tipo, options);
  }
}
