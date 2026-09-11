import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { select, checkbox, input, confirm } from '@inquirer/prompts';
import { simpleGit } from 'simple-git';
import { runGenerate } from './pipeline.js';
import { renderDocument } from './renderer.js';
import { getCommits, getAllBranches } from './git.js';
import { parseCommit } from './parser.js';
import { detectBaseBranch, extractTopology, printTopologyReport } from './graph/topology.js';
import { analyzeCollaborators } from './graph/collaborators.js';
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

  const baseBranchAnswer = await _input({
    message: t('wizard.init.baseBranch'),
    default: existingConfig.baseBranch || 'main',
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
  if (baseBranchAnswer && baseBranchAnswer.trim()) config.baseBranch = baseBranchAnswer.trim();
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
      { name: t('wizard.generate.graphChoice'), value: 'graph' },
    ],
  });

  // Si es tipo graph, preguntar estilo de diagrama
  let diagramStyle = 'flowchart';
  if (tipo === 'graph') {
    diagramStyle = await _select({
      message: t('wizard.graph.selectDiagramStyle'),
      choices: [
        { name: t('wizard.graph.diagramFlowchart'), value: 'flowchart' },
        { name: t('wizard.graph.diagramGitGraph'), value: 'gitgraph' },
        { name: t('wizard.graph.diagramBoth'), value: 'both' },
      ],
      default: 'flowchart',
    });
  }



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
    const defaultOutput = tipo === 'changelog' ? 'CHANGELOG.md' : (tipo === 'pap' ? 'PAP.md' : 'GRAPH.md');
    outputPath = await _input({
      message: t('wizard.generate.outputPath'),
      default: defaultOutput,
    });
  }

  // 6. Verbose (solo para changelog y pap)
  let verbose = false;
  if (tipo !== 'graph') {
    verbose = await _confirm({
      message: t('wizard.generate.confirmVerbose'),
      default: false,
    });
  }

  // --- Compilar opciones ---
  const genOptions = {
    from: fromRef || undefined,
    to: toRef === 'HEAD' ? undefined : toRef,
    scope: scopeFilter || undefined,
    simplified: diagramStyle === 'flowchart',
    diagramStyle: tipo === 'graph' ? diagramStyle : undefined,
    dryRun: isDryRun,
    output: outputPath || undefined,
    verbose,
    lang: options.lang,
  };

  console.log();

  if (isDryRun) {
    // Previsualización: renderizar y mostrar en consola
    try {
      if (tipo === 'graph') {
        const { extractTopology } = await import('./graph/topology.js');
        const { analyzeCollaborators } = await import('./graph/collaborators.js');
        const topo = await extractTopology(genOptions);
        const metrics = analyzeCollaborators(topo, genOptions);
        const markdown = await renderDocument(topo, 'graph', {
          simplified: genOptions.simplified,
          diagramStyle: genOptions.diagramStyle,
          topology: topo,
          collaborators: metrics,
          i18nInstance: activeI18n,
        });

        console.log(pc.yellow(t('wizard.generate.previewNotice')));
        console.log(pc.dim('─'.repeat(60)));
        console.log(markdown);
        console.log(pc.dim('─'.repeat(60)));
      } else {
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
      }
    } catch (err) {
      console.error(pc.red(t('wizard.generate.previewError', { error: err.message })));
      process.exit(1);
    }
  } else {
    // Persistir: delegar en el pipeline completo
    await runGenerate(tipo, genOptions);
  }
}

// ---------------------------------------------------------------------------
// Flujo 3: Topología guiada — análisis interactivo de ramas y colaboradores
// ---------------------------------------------------------------------------

/**
 * Guía al usuario de forma interactiva para analizar la topología del repositorio,
 * seleccionar rama base, aplicar filtros y visualizar el reporte o JSON.
 *
 * @param {object} [prompts] - Inyección de dependencias de prompts (para testing).
 * @param {object} [options] - Opciones de CLI (ej. options.lang)
 */
export async function runWizardTopology(prompts = {}, options = {}) {
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

  console.log(pc.cyan(t('wizard.topology.header')));

  // 1. Obtener ramas disponibles
  let branches = [];
  try {
    branches = await getAllBranches(options);
  } catch (err) {
    console.error(pc.red(`\n✖ Error: ${err.message}\n`));
    process.exit(1);
  }

  const detectedBase = detectBaseBranch(branches, { baseBranch: existingConfig.baseBranch });
  const branchChoices = branches.map((b) => ({
    name: `${b.name}${b.name === detectedBase ? ' (default)' : ''}`,
    value: b.name,
  }));

  // 2. Selección de rama base
  const selectedBase = await _select({
    message: t('wizard.topology.selectBase'),
    choices: branchChoices.length > 0 ? branchChoices : [{ name: 'main', value: 'main' }],
    default: detectedBase,
  });

  // Extraer topología preliminar para identificar exclusivamente las ramas hijas de la base seleccionada
  let childBranches = [];
  try {
    const baseTopo = await extractTopology({ ...options, baseBranch: selectedBase });
    const baseObj = baseTopo.branches.find((b) => b.name === selectedBase);
    const childSet = new Set([
      ...(baseObj?.children || []),
      ...(baseObj?.mergedChildren || []),
    ]);
    childBranches = Array.from(childSet).filter((b) => b !== selectedBase);
  } catch {
    childBranches = branches.filter((b) => b.name !== selectedBase).map((b) => b.name);
  }

  const childChoices = childBranches.length > 0
    ? childBranches.map((name) => ({ name, value: name }))
    : branches.filter((b) => b.name !== selectedBase).map((b) => ({ name: b.name, value: b.name }));

  // 3. Filtro opcional por rama específica (solo ramas hijas para no saturar al usuario ni al modelo)
  const filterBranchChoice = await _select({
    message: t('wizard.topology.filterBranchPrompt'),
    choices: [
      { name: t('wizard.topology.allBranchesChoice'), value: '' },
      ...childChoices,
    ],
  });

  // 4. Filtro opcional por autor
  const authorAnswer = await _input({
    message: t('wizard.topology.filterAuthorPrompt'),
    default: '',
  });

  // 5. Filtro opcional por fechas
  const wantDateFilter = await _confirm({
    message: t('wizard.topology.askDateFilters'),
    default: false,
  });

  let since = '';
  let until = '';
  if (wantDateFilter) {
    since = await _input({
      message: t('wizard.topology.sincePrompt'),
      default: '',
    });
    until = await _input({
      message: t('wizard.topology.untilPrompt'),
      default: '',
    });
  }

  // 6. Formato de salida o generación
  const format = await _select({
    message: t('wizard.topology.selectFormat'),
    choices: [
      { name: t('wizard.topology.formatTree'), value: 'tree' },
      { name: t('wizard.topology.formatGraph'), value: 'graph' },
      { name: t('wizard.topology.formatTerminal'), value: 'terminal' },
      { name: t('wizard.topology.formatJson'), value: 'json' },
    ],
    default: 'tree',
  });

  const topoOptions = {
    ...options,
    baseBranch: selectedBase,
    branch: filterBranchChoice || undefined,
    author: authorAnswer.trim() || undefined,
    since: since.trim() || undefined,
    until: until.trim() || undefined,
    json: format === 'json',
  };

  try {
    const topo = await extractTopology(topoOptions);
    const metrics = analyzeCollaborators(topo, topoOptions);

    if (format === 'tree') {
      const { printTerminalTree } = await import('./graph/terminal.js');
      printTerminalTree(topo, metrics);
      return { topology: topo, collaborators: metrics };
    }

    if (format === 'graph') {
      const diagramStyle = await _select({
        message: t('wizard.graph.selectDiagramStyle'),
        choices: [
          { name: t('wizard.graph.diagramFlowchart'), value: 'flowchart' },
          { name: t('wizard.graph.diagramGitGraph'), value: 'gitgraph' },
          { name: t('wizard.graph.diagramBoth'), value: 'both' },
        ],
        default: 'flowchart',
      });
      const outputPath = await _input({
        message: t('wizard.generate.outputPath'),
        default: 'GRAPH.md',
      });
      const markdown = await renderDocument(topo, 'graph', {
        simplified: diagramStyle === 'flowchart',
        diagramStyle,
        topology: topo,
        collaborators: metrics,
        remoteUrl: existingConfig.remoteUrl || undefined,
        i18nInstance: activeI18n,
      });
      const resolvedPath = resolve(process.cwd(), outputPath || 'GRAPH.md');
      await mkdir(dirname(resolvedPath), { recursive: true });
      await writeFile(resolvedPath, markdown, 'utf-8');
      console.log(pc.green(t('wizard.topology.graphSaved', { path: outputPath || 'GRAPH.md' })));
      return { topology: topo, collaborators: metrics };
    }

    if (format === 'json') {
      console.log(JSON.stringify({ topology: topo, collaborators: metrics }, null, 2));
      return { topology: topo, collaborators: metrics };
    }

    printTopologyReport(topo, metrics);
    return { topology: topo, collaborators: metrics };
  } catch (err) {
    console.error(pc.red(`\n✖ Error: ${err.message}\n`));
    process.exit(1);
  }
}

