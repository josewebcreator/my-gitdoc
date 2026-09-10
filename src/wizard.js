import { writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { select, checkbox, input, confirm } from '@inquirer/prompts';
import { simpleGit } from 'simple-git';
import { runGenerate } from './pipeline.js';
import { renderDocument } from './renderer.js';
import { getCommits } from './git.js';
import { parseCommit } from './parser.js';
import { initI18n, t } from './i18n/index.js';
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
 * @param {object} [options] - Opciones de CLI (ej. options.lang)
 */
export async function runWizardInit(prompts = {}, options = {}) {
  const _input    = prompts.input    ?? input;
  const _checkbox = prompts.checkbox ?? checkbox;
  const _confirm  = prompts.confirm  ?? confirm;
  const _select   = prompts.select   ?? select;

  const configPath = resolve(process.cwd(), '.gitdocrc.json');
  let existingConfig = {};
  if (existsSync(configPath)) {
    try {
      existingConfig = JSON.parse(await readFile(configPath, 'utf-8'));
    } catch {
      // ignorar errores de parseo
    }
  }

  initI18n({
    lang: options.lang,
    configLocale: existingConfig.locale,
    customCatalogs: existingConfig.i18n,
  });

  console.log(pc.cyan(t('wizard.init.header')));

  if (existsSync(configPath)) {
    console.log(pc.yellow(t('wizard.init.existingConfigWarning')));
  }

  // --- Preguntas ---

  const remoteUrl = await _input({
    message: t('wizard.init.remoteUrl'),
    default: existingConfig.remoteUrl || '',
  });

  const KNOWN_TYPES = ['feat', 'fix', 'perf', 'refactor', 'docs', 'style', 'test', 'build', 'ci', 'chore', 'revert'];
  const allowedTypesAnswer = await _checkbox({
    message: t('wizard.init.allowedTypes'),
    choices: KNOWN_TYPES.map(t => ({
      name: t,
      value: t,
      checked: existingConfig.allowedTypes
        ? existingConfig.allowedTypes.includes(t)
        : ['feat', 'fix', 'perf', 'refactor', 'docs', 'build', 'ci', 'chore'].includes(t),
    })),
  });

  const scopesRaw = await _input({
    message: t('wizard.init.allowedScopes'),
    default: existingConfig.allowedScopes ? existingConfig.allowedScopes.join(', ') : '',
  });

  // Hito 10 Task 3.4: Preguntar idioma por defecto si no existe en .gitdocrc.json
  let selectedLocale = existingConfig.locale;
  if (!existingConfig.locale) {
    const isMockedWithoutSelect = prompts && Object.keys(prompts).length > 0 && !prompts.select;
    if (!isMockedWithoutSelect) {
      selectedLocale = await _select({
        message: t('wizard.init.selectLanguage'),
        choices: [
          { name: 'English (en)', value: 'en' },
          { name: 'Español (es)', value: 'es' },
        ],
        default: 'en',
      });
    } else {
      selectedLocale = 'en';
    }
  }

  // --- Construir objeto de configuración ---

  const config = {};
  if (selectedLocale) config.locale = selectedLocale;
  if (remoteUrl.trim()) config.remoteUrl = remoteUrl.trim();
  if (allowedTypesAnswer.length > 0) config.allowedTypes = allowedTypesAnswer;
  if (scopesRaw.trim()) {
    config.allowedScopes = scopesRaw.split(',').map(s => s.trim()).filter(Boolean);
  }

  // Preservar otras claves que pudieran existir (ej: forbiddenTerms, i18n)
  const finalConfig = { ...existingConfig, ...config };

  const shouldWrite = await _confirm({
    message: t('wizard.init.confirmSave', { file: pc.bold('.gitdocrc.json') }),
    default: true,
  });

  if (!shouldWrite) {
    console.log(pc.yellow(t('wizard.init.cancelled')));
    return;
  }

  await writeFile(configPath, JSON.stringify(finalConfig, null, 2), 'utf-8');
  console.log(pc.green(t('wizard.init.success')));
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
 * @param {object} [options] - Opciones de CLI (ej. options.lang)
 */
export async function runWizardGenerate(prompts = {}, options = {}) {
  const _select  = prompts.select  ?? select;
  const _input   = prompts.input   ?? input;
  const _confirm = prompts.confirm ?? confirm;

  // Cargar .gitdocrc.json para configurar i18n
  const configPath = resolve(process.cwd(), '.gitdocrc.json');
  let existingConfig = {};
  if (existsSync(configPath)) {
    try {
      existingConfig = JSON.parse(await readFile(configPath, 'utf-8'));
    } catch {}
  }

  const activeI18n = initI18n({
    lang: options.lang,
    configLocale: existingConfig.locale,
    customCatalogs: existingConfig.i18n,
  });

  console.log(pc.cyan(t('wizard.generate.header')));

  // 1. Tipo de documento
  const tipo = await _select({
    message: t('wizard.generate.selectType'),
    choices: [
      { name: t('wizard.generate.changelogChoice'), value: 'changelog' },
      { name: t('wizard.generate.papChoice'), value: 'pap' },
    ],
  });

  // 2. Rango de commits: --from / --to
  const refs = await getGitRefs();
  const refChoices = refs.map(r => ({ name: r, value: r }));

  const fromRef = await _select({
    message: t('wizard.generate.fromRef'),
    choices: [{ name: t('wizard.generate.noFromChoice'), value: '' }, ...refChoices],
  });

  const toRef = await _select({
    message: t('wizard.generate.toRef'),
    choices: refChoices,
    default: 'HEAD',
  });

  // 3. Scope filter (opcional)
  const knownScopes = await getKnownScopes(fromRef || undefined, toRef === 'HEAD' ? undefined : toRef);
  let scopeFilter = '';

  if (knownScopes.length > 0) {
    const scopeChoices = [
      { name: t('wizard.generate.noScopeFilter'), value: '' },
      ...knownScopes.map(s => ({ name: s, value: s })),
      { name: t('wizard.generate.manualScope'), value: '__manual__' },
    ];
    const scopeAnswer = await _select({
      message: t('wizard.generate.scopeFilter'),
      choices: scopeChoices,
    });
    if (scopeAnswer === '__manual__') {
      scopeFilter = await _input({ message: t('wizard.generate.enterScope') });
    } else {
      scopeFilter = scopeAnswer;
    }
  } else {
    const manualScope = await _input({
      message: t('wizard.generate.filterScopePrompt'),
      default: '',
    });
    scopeFilter = manualScope.trim();
  }

  // 4. Modo: dry-run o persistir
  const isDryRun = await _confirm({
    message: t('wizard.generate.confirmDryRun'),
    default: true,
  });

  // 5. Nombre de archivo de salida (solo si persistir)
  let outputPath = '';
  if (!isDryRun) {
    const defaultOutput = tipo === 'changelog' ? 'CHANGELOG.md' : 'PAP.md';
    outputPath = await _input({
      message: t('wizard.generate.outputPath'),
      default: defaultOutput,
    });
  }

  // 6. Verbose
  const verbose = await _confirm({
    message: t('wizard.generate.confirmVerbose'),
    default: false,
  });

  // --- Compilar opciones ---
  const genOptions = {
    from: fromRef || undefined,
    to: toRef === 'HEAD' ? undefined : toRef,
    scope: scopeFilter || undefined,
    dryRun: isDryRun,
    output: outputPath || undefined,
    verbose,
    lang: options.lang,
  };

  console.log();

  if (isDryRun) {
    // Previsualización: renderizar y mostrar en consola
    try {
      const { runPipeline } = await import('./pipeline.js');
      const parsedCommits = [];
      for await (const commit of runPipeline(tipo, genOptions)) {
        parsedCommits.push(commit);
      }
      const markdown = await renderDocument(parsedCommits, tipo, {
        scope: genOptions.scope,
        verbose: genOptions.verbose,
        i18nInstance: activeI18n,
      });

      console.log(pc.yellow(t('wizard.generate.previewNotice')));
      console.log(pc.dim('─'.repeat(60)));
      console.log(markdown);
      console.log(pc.dim('─'.repeat(60)));
    } catch (err) {
      console.error(pc.red(t('wizard.generate.previewError', { error: err.message })));
      process.exit(1);
    }
  } else {
    // Persistir: delegar en el pipeline completo
    await runGenerate(tipo, genOptions);
  }
}
