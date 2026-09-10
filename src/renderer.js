import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import { t, getI18n, createI18n } from './i18n/index.js';
import {
  buildDetailedGitGraph,
  buildSimplifiedFlowchart,
  generateCollaboratorsTableData,
} from './graph/mermaid.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Helper Handlebars para traducir claves de i18n
Handlebars.registerHelper('t', function(key, options) {
  const params = (options && options.hash) ? options.hash : {};
  return t(key, params);
});

// --- Tipos permitidos por variante ---

const CHANGELOG_TYPES = new Set(['feat', 'fix', 'perf', 'refactor']);
const PAP_TYPES = new Set(['ci', 'build']);
const PAP_INFRA_SCOPES = new Set(['db', 'infra', 'docker', 'config']);

// --- Hito 7: Directivas técnicas ---

// Regex para detectar directivas técnicas al inicio de una línea (case-insensitive)
const DIRECTIVE_REGEX = /^(RUN|MIGRATE|ROLLBACK|VERIFY)\s*:\s*(.+)$/i;

/**
 * Parsea el body de un commit extrayendo líneas de directivas técnicas.
 * Soporta RUN: / MIGRATE: (ejecución), ROLLBACK: (marcha atrás), VERIFY: (pruebas de humo).
 *
 * @param {string|null|undefined} body - Cuerpo del commit
 * @returns {{ run: string[], rollback: string[], verify: string[] }}
 */
export function parseInstructions(body) {
  const result = { run: [], rollback: [], verify: [] };
  if (!body) return result;

  const lines = body.split('\n');
  for (const line of lines) {
    const match = line.trim().match(DIRECTIVE_REGEX);
    if (!match) continue;
    const directive = match[1].toUpperCase();
    const content = match[2].trim();

    if (directive === 'RUN' || directive === 'MIGRATE') {
      result.run.push(content);
    } else if (directive === 'ROLLBACK') {
      result.rollback.push(content);
    } else if (directive === 'VERIFY') {
      result.verify.push(content);
    }
  }

  return result;
}

/**
 * Genera hipervínculos Markdown para hashes de commits e issues (#NNN)
 * usando la URL base del repositorio remoto.
 *
 * @param {string} text - Texto donde buscar patrones
 * @param {string|undefined} remoteUrl - URL base del repositorio (ej. https://github.com/user/repo)
 * @returns {string} Texto con hipervínculos insertados
 */
export function generateRemoteLinks(text, remoteUrl) {
  if (!remoteUrl || !text) return text;

  // Preservar bloques de código cercados (como ```mermaid ... ```) intactos para no corromper su sintaxis
  const codeBlocks = [];
  const placeholderText = text.replace(/(```[\s\S]*?```)/g, (match) => {
    const idx = codeBlocks.length;
    codeBlocks.push(match);
    return `__CODE_BLOCK_${idx}__`;
  });

  // Normalizar: eliminar trailing slash
  const base = remoteUrl.replace(/\/$/, '');

  // Reemplazar hashes largos (40 hex) antes que cortos (7 hex) para evitar colisiones
  let result = placeholderText.replace(
    /\b([0-9a-f]{40})\b/g,
    (_, hash) => `[${hash.slice(0, 7)}](${base}/commit/${hash})`
  );

  // Solo linkear hashes de 7 chars que NO estén ya dentro de un link Markdown ([texto])
  result = result.replace(
    /(?<!\[)\b([0-9a-f]{7})\b(?!\w)(?!\])/g,
    (_, hash) => `[${hash}](${base}/commit/${hash})`
  );

  // Reemplazar referencias a issues/PRs (#NNN) — solo si no están ya dentro de un link
  result = result.replace(
    /(?<!\[)#(\d+)(?!\])/g,
    (_, num) => `[#${num}](${base}/issues/${num})`
  );

  // Restaurar los bloques de código cercados
  result = result.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => codeBlocks[Number(idx)]);

  return result;
}

/**
 * Agrupa commits para el reporte Changelog.
 * Filtra por feat | fix | perf | refactor y opcionalmente otros tipos en modo verboso.
 *
 * @param {object[]} commits  - Commits parseados por parseCommit()
 * @param {string|undefined} scopeFilter - Scope a filtrar (flag --scope)
 * @param {boolean} verbose - Indica si se incluye verbosidad y otros tipos
 * @param {object|null} [i18nInstance] - Instancia opcional de i18n para resolución localizada de títulos
 * @returns {{ breakingChanges: object[], sections: { title: string, commits: object[] }[] }}
 */
export function groupForChangelog(commits, scopeFilter, verbose = false, i18nInstance = null) {
  const allowedTypes = verbose
    ? new Set(['feat', 'fix', 'perf', 'refactor', 'docs', 'style', 'test', 'build', 'ci', 'chore', 'revert'])
    : CHANGELOG_TYPES;

  const filtered = commits.filter(c => {
    if (!allowedTypes.has(c.type)) return false;
    if (scopeFilter && c.scope !== scopeFilter) return false;
    return true;
  });

  const breakingChanges = [];
  // sections indexado por tipo para mantener orden
  const sectionMap = new Map();
  const translate = (i18nInstance && i18nInstance.t) || t;

  for (const commit of filtered) {
    // Detectar breaking change: notes con title BREAKING CHANGE
    const breakNote = (commit.notes || []).find(n =>
      n.title && n.title.toUpperCase().includes('BREAKING CHANGE')
    );

    if (breakNote) {
      breakingChanges.push({ ...commit, note: breakNote.text });
    }

    // Siempre añadir a su sección de tipo (incluso si es breaking change)
    const titleKey = `sections.${commit.type}`;
    const translated = translate(titleKey);
    const fallbackTitle = commit.type
      ? commit.type.charAt(0).toUpperCase() + commit.type.slice(1)
      : translate('sections.other');
    const title = (translated && translated !== titleKey) ? translated : fallbackTitle;

    if (!sectionMap.has(commit.type)) {
      sectionMap.set(commit.type, { title, commits: [] });
    }
    sectionMap.get(commit.type).commits.push(commit);
  }

  // Orden canónico de secciones
  const orderedTypes = verbose
    ? ['feat', 'fix', 'perf', 'refactor', 'docs', 'style', 'test', 'build', 'ci', 'chore', 'revert']
    : ['feat', 'fix', 'perf', 'refactor'];

  const allOrderedTypes = [
    ...orderedTypes,
    ...Array.from(sectionMap.keys()).filter(t => !orderedTypes.includes(t))
  ];

  const sections = allOrderedTypes
    .filter(t => sectionMap.has(t))
    .map(t => sectionMap.get(t));

  return { breakingChanges, sections };
}

/**
 * Agrupa commits para el reporte PAP.
 * Incluye ci | build o commits con scope de infraestructura.
 * Agrupa por scope (o 'sin-scope' cuando es undefined).
 * Cada commit es enriquecido con sus instrucciones técnicas parseadas del body.
 *
 * @param {object[]} commits
 * @param {string|undefined} scopeFilter
 * @returns {{ scopes: { scope: string, commits: object[] }[] }}
 */
export function groupForPap(commits, scopeFilter) {
  const filtered = commits.filter(c => {
    const isPapType = PAP_TYPES.has(c.type);
    const isInfraScope = c.scope && PAP_INFRA_SCOPES.has(c.scope);
    if (!isPapType && !isInfraScope) return false;
    if (scopeFilter && c.scope !== scopeFilter) return false;
    return true;
  });

  const scopeMap = new Map();
  for (const commit of filtered) {
    const key = commit.scope || 'sin-scope';
    if (!scopeMap.has(key)) {
      scopeMap.set(key, { scope: key, commits: [] });
    }

    // Hito 7: enriquecer cada commit con instrucciones técnicas parseadas
    const instructions = parseInstructions(commit.body);
    const hasInstructions = instructions.run.length > 0 || instructions.rollback.length > 0 || instructions.verify.length > 0;

    scopeMap.get(key).commits.push({
      ...commit,
      instructions,
      hasInstructions,
    });
  }

  return { scopes: [...scopeMap.values()] };
}

/**
 * Carga de forma asíncrona la plantilla .hbs correspondiente al tipo.
 *
 * @param {'changelog'|'pap'|'graph'} tipo
 * @param {string|undefined} customTemplatePath - Ruta de plantilla personalizada
 * @returns {Promise<string>} Contenido raw de la plantilla
 */
export async function loadTemplate(tipo, customTemplatePath) {
  const templatePath = customTemplatePath
    ? resolve(process.cwd(), customTemplatePath)
    : resolve(__dirname, '..', 'templates', `${tipo}.hbs`);
  return readFile(templatePath, 'utf-8');
}

/**
 * Orquesta el renderizado completo: agrupa, carga plantilla e inyecta con Handlebars.
 * Si `options.remoteUrl` está definido, aplica autolinking de hashes e issues en el markdown final.
 *
 * @param {object[]|object} commitsOrTopology - Commits parseados o resultado topológico
 * @param {'changelog'|'pap'|'graph'} tipo
 * @param {object|string|undefined} optionsOrScope - Objeto de opciones o filtro de scope (compatibilidad)
 * @returns {Promise<string>} Markdown renderizado listo para escribir o imprimir
 */
export async function renderDocument(commitsOrTopology, tipo, optionsOrScope) {
  let scopeFilter;
  let templatePath;
  let verbose = false;
  let remoteUrl;
  let lang;
  let customCatalogs;
  let i18nInstance;
  let simplified = false;
  let topology = null;
  let collaborators = null;

  if (optionsOrScope && typeof optionsOrScope === 'object') {
    scopeFilter = optionsOrScope.scope;
    templatePath = optionsOrScope.template;
    verbose = !!optionsOrScope.verbose;
    remoteUrl = optionsOrScope.remoteUrl;
    lang = optionsOrScope.lang || optionsOrScope.locale;
    customCatalogs = optionsOrScope.i18n || optionsOrScope.customCatalogs;
    i18nInstance = optionsOrScope.i18nInstance;
    simplified = !!optionsOrScope.simplified;
    topology = optionsOrScope.topology || null;
    collaborators = optionsOrScope.collaborators || null;
  } else {
    scopeFilter = optionsOrScope;
  }

  const currentI18n = i18nInstance
    || ((lang || customCatalogs) ? createI18n({ lang, customCatalogs }) : getI18n());
  const translate = currentI18n.t;

  const templateContent = await loadTemplate(tipo, templatePath);
  const template = Handlebars.compile(templateContent);

  let data;
  if (tipo === 'graph') {
    const topoData = topology || (commitsOrTopology && !Array.isArray(commitsOrTopology) ? (commitsOrTopology.topology || commitsOrTopology) : { branches: [], baseBranch: 'main' });
    const collabData = collaborators || (commitsOrTopology && commitsOrTopology.collaborators ? commitsOrTopology.collaborators : {});

    const mermaidDiagram = simplified
      ? buildSimplifiedFlowchart(topoData, collabData, { i18nInstance: currentI18n })
      : buildDetailedGitGraph(topoData, { i18nInstance: currentI18n });

    const branchSummary = generateCollaboratorsTableData(topoData, collabData, { i18nInstance: currentI18n });

    const globalSummary = (collabData?.global || []).map(g => ({
      name: g.name,
      commitsCount: g.commitsCount,
      typesList: Object.entries(g.types || {}).map(([k, v]) => `${k}:${v}`).join(', ') || '-',
      scopesList: (g.scopes || []).join(', ') || '-',
    }));

    data = {
      mermaidDiagram,
      branchSummary,
      globalSummary: globalSummary.length > 0 ? globalSummary : null,
      labels: {
        title: translate('graph.title'),
        collaboratorsTitle: translate('graph.collaboratorsTitle'),
        globalTitle: translate('graph.globalTitle'),
        tableBranch: translate('graph.tableBranch'),
        tableStatus: translate('graph.tableStatus'),
        tableCollaborators: translate('graph.tableCollaborators'),
        tableCommits: translate('graph.tableCommits'),
        tableTypes: translate('graph.tableTypes'),
        tableScopes: translate('graph.tableScopes'),
      },
    };
  } else {
    const commits = Array.isArray(commitsOrTopology) ? commitsOrTopology : [];
    // Inyectar verbose flag en cada commit para simplificar plantillas
    const commitsWithVerbose = commits.map(c => ({
      ...c,
      verbose
    }));

    if (tipo === 'changelog') {
      data = groupForChangelog(commitsWithVerbose, scopeFilter, verbose, currentI18n);
      data.labels = {
        breakingChanges: translate('sections.breakingChanges'),
      };
    } else {
      data = groupForPap(commitsWithVerbose, scopeFilter);
      data.labels = {
        title: translate('pap.title'),
        component: translate('pap.component'),
        run: translate('pap.directives.run'),
        rollback: translate('pap.directives.rollback'),
        verify: translate('pap.directives.verify'),
      };
    }
  }

  let markdown = template(data);

  // Hito 7 & 12: aplicar autolinking remoto si remoteUrl está configurado
  if (remoteUrl) {
    markdown = generateRemoteLinks(markdown, remoteUrl);
  }

  return markdown;
}
