import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Tipos permitidos por variante ---

const CHANGELOG_TYPES = new Set(['feat', 'fix', 'perf', 'refactor']);
const PAP_TYPES = new Set(['ci', 'build']);
const PAP_INFRA_SCOPES = new Set(['db', 'infra', 'docker', 'config']);

// Mapeo tipo → título de sección en español
const TYPE_TITLES = {
  feat:     'Nuevas Características',
  fix:      'Correcciones de Bugs',
  perf:     'Mejoras de Rendimiento',
  refactor: 'Refactorizaciones',
};

/**
 * Agrupa commits para el reporte Changelog.
 * Filtra por feat | fix | perf | refactor y aisla breaking changes.
 *
 * @param {object[]} commits  - Commits parseados por parseCommit()
 * @param {string|undefined} scopeFilter - Scope a filtrar (flag --scope)
 * @returns {{ breakingChanges: object[], sections: { title: string, commits: object[] }[] }}
 */
export function groupForChangelog(commits, scopeFilter) {
  const filtered = commits.filter(c => {
    if (!CHANGELOG_TYPES.has(c.type)) return false;
    if (scopeFilter && c.scope !== scopeFilter) return false;
    return true;
  });

  const breakingChanges = [];
  // sections indexado por tipo para mantener orden
  const sectionMap = new Map();

  for (const commit of filtered) {
    // Detectar breaking change: notes con title BREAKING CHANGE
    const breakNote = (commit.notes || []).find(n =>
      n.title && n.title.toUpperCase().includes('BREAKING CHANGE')
    );

    if (breakNote) {
      breakingChanges.push({ ...commit, note: breakNote.text });
    }

    // Siempre añadir a su sección de tipo (incluso si es breaking change)
    const title = TYPE_TITLES[commit.type] || commit.type;
    if (!sectionMap.has(commit.type)) {
      sectionMap.set(commit.type, { title, commits: [] });
    }
    sectionMap.get(commit.type).commits.push(commit);
  }

  // Orden canónico de secciones
  const orderedTypes = ['feat', 'fix', 'perf', 'refactor'];
  const sections = orderedTypes
    .filter(t => sectionMap.has(t))
    .map(t => sectionMap.get(t));

  return { breakingChanges, sections };
}

/**
 * Agrupa commits para el reporte PAP.
 * Incluye ci | build o commits con scope de infraestructura.
 * Agrupa por scope (o 'sin-scope' cuando es undefined).
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
    scopeMap.get(key).commits.push(commit);
  }

  return { scopes: [...scopeMap.values()] };
}

/**
 * Carga de forma asíncrona la plantilla .hbs correspondiente al tipo.
 *
 * @param {'changelog'|'pap'} tipo
 * @returns {Promise<string>} Contenido raw de la plantilla
 */
export async function loadTemplate(tipo) {
  const templatePath = resolve(__dirname, '..', 'templates', `${tipo}.hbs`);
  return readFile(templatePath, 'utf-8');
}

/**
 * Orquesta el renderizado completo: agrupa, carga plantilla e inyecta con Handlebars.
 *
 * @param {object[]} commits     - Commits parseados y validados
 * @param {'changelog'|'pap'} tipo
 * @param {string|undefined} scopeFilter
 * @returns {Promise<string>} Markdown renderizado listo para escribir o imprimir
 */
export async function renderDocument(commits, tipo, scopeFilter) {
  const templateContent = await loadTemplate(tipo);
  const template = Handlebars.compile(templateContent);

  let data;
  if (tipo === 'changelog') {
    data = groupForChangelog(commits, scopeFilter);
  } else {
    data = groupForPap(commits, scopeFilter);
  }

  return template(data);
}
