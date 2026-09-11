import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCommit } from '../parser.js';

const RELEVANT_TYPES = new Set(['feat', 'fix', 'perf', 'refactor', 'docs']);
const CONVENTIONAL_TYPES = new Set([
  'feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'
]);

/**
 * Calcula resúmenes estructurados estilo Git para cada rama fusionada y evento de merge.
 * @param {Object} topologyData
 * @returns {Array<Object>}
 */
export function calculateMergeSummaries(topologyData) {
  const summaries = [];
  const branches = topologyData.branches || [];
  const merges = topologyData.merges || [];
  const baseBranch = topologyData.baseBranch || 'main';

  for (const b of branches) {
    if (b.status === 'merged' || b.mergedInto) {
      const target = b.mergedInto || (b.parentBranch || baseBranch);
      const commits = (b.mergedCommits && b.mergedCommits.length > 0)
        ? b.mergedCommits
        : (b.commits || []);

      const contributors = [...new Set(commits.map((c) => c.author).filter(Boolean))];
      const typesSummary = {};
      for (const c of commits) {
        const parsed = parseCommit(c.subject || '');
        if (parsed.type) {
          typesSummary[parsed.type] = (typesSummary[parsed.type] || 0) + 1;
        }
      }

      const forkShort = b.forkPoint ? b.forkPoint.substring(0, 7) : 'root';
      const tipShort = b.targetCommit ? b.targetCommit.substring(0, 7) : '';
      const hashRange = `${forkShort}..${tipShort}`;

      summaries.push({
        title: `Merge branch '${b.name}' into '${target}'`,
        branch: b.name,
        target,
        mergeCommit: b.mergeCommit || null,
        totalCommits: commits.length,
        contributors,
        typesSummary,
        hashRange,
      });
    }
  }

  // Resúmenes para merge commits explícitos adicionales
  for (const m of merges) {
    const exists = summaries.some((s) => s.mergeCommit === m.hash);
    if (!exists) {
      summaries.push({
        title: m.subject || `Merge commit ${m.hash.substring(0, 7)}`,
        branch: null,
        target: null,
        mergeCommit: m.hash,
        totalCommits: 1,
        contributors: m.author ? [m.author] : [],
        typesSummary: {},
        hashRange: m.parents
          ? `${m.parents.map((p) => p.substring(0, 7)).join(' + ')}..${m.hash.substring(0, 7)}`
          : m.hash.substring(0, 7),
      });
    }
  }

  return summaries;
}

/**
 * Enriquece cada commit del historial con metadatos Conventional Commit y clasificación de relevancia.
 * @param {Object} topologyData
 * @returns {Array<Object>}
 */
export function enrichCommits(topologyData) {
  const dagNodes = [];
  const seen = new Set();
  const branches = topologyData.branches || [];

  for (const b of branches) {
    for (const c of b.commits || []) {
      if (!seen.has(c.hash)) {
        seen.add(c.hash);
        const parsed = parseCommit(`${c.subject || ''}\n\n${c.body || ''}`);
        const isConventional = Boolean(parsed.type && CONVENTIONAL_TYPES.has(parsed.type.toLowerCase()));
        const hasBreakingChange = (parsed.notes || []).some(
          (n) => n.title && n.title.toUpperCase().includes('BREAKING CHANGE')
        );
        const isRelevant = Boolean(
          (parsed.type && RELEVANT_TYPES.has(parsed.type.toLowerCase())) ||
          hasBreakingChange ||
          c.isMerge
        );

        dagNodes.push({
          hash: c.hash,
          parents: c.parents || [],
          children: c.children || [],
          author: c.author || '',
          email: c.email || '',
          timestamp: typeof c.timestamp === 'number' ? c.timestamp : 0,
          date: c.date ? (c.date instanceof Date ? c.date.toISOString() : c.date) : new Date(0).toISOString(),
          subject: c.subject || '',
          body: c.body || parsed.body || '',
          isMerge: Boolean(c.isMerge || (c.parents && c.parents.length > 1)),
          branches: Array.from(c.branches || [b.name]),
          type: parsed.type || null,
          scope: parsed.scope || null,
          notes: parsed.notes || [],
          isConventional,
          isRelevant,
        });
      }
    }
  }

  // Incluir commits del DAG no asociados a ramas filtradas
  if (topologyData.dag instanceof Map) {
    for (const [hash, node] of topologyData.dag.entries()) {
      if (!seen.has(hash)) {
        seen.add(hash);
        const parsed = parseCommit(`${node.subject || ''}\n\n${node.body || ''}`);
        const isConventional = Boolean(parsed.type);
        const hasBreakingChange = (parsed.notes || []).some(
          (n) => n.title && n.title.toUpperCase().includes('BREAKING CHANGE')
        );
        const isRelevant = Boolean(
          (parsed.type && RELEVANT_TYPES.has(parsed.type)) ||
          hasBreakingChange ||
          node.isMerge
        );

        dagNodes.push({
          hash: node.hash,
          parents: node.parents || [],
          children: node.children || [],
          author: node.author || '',
          email: node.email || '',
          timestamp: typeof node.timestamp === 'number' ? node.timestamp : 0,
          date: node.date ? (node.date instanceof Date ? node.date.toISOString() : node.date) : new Date(0).toISOString(),
          subject: node.subject || '',
          body: node.body || parsed.body || '',
          isMerge: Boolean(node.isMerge || (node.parents && node.parents.length > 1)),
          branches: Array.from(node.branches || []),
          type: parsed.type || null,
          scope: parsed.scope || null,
          notes: parsed.notes || [],
          isConventional,
          isRelevant,
        });
      }
    }
  }

  return dagNodes;
}

/**
 * Compila el visor HTML interactivo autocontenido inyectando datos serializados en la plantilla.
 * @param {Object} topologyData
 * @param {Object} collaboratorsData
 * @param {Object} [options]
 * @returns {Promise<string>}
 */
export async function generateHtmlViewer(topologyData, collaboratorsData, options = {}) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const templatePath = options.templatePath
    ? resolve(process.cwd(), options.templatePath)
    : resolve(__dirname, '../../templates/graph-viewer.html');

  let templateHtml = await readFile(templatePath, 'utf-8');

  const mergeSummaries = calculateMergeSummaries(topologyData);
  const dagNodes = enrichCommits(topologyData);

  // Serializar ramas para JSON sin ciclos
  const serializableBranches = (topologyData.branches || []).map((b) => ({
    name: b.name,
    targetCommit: b.targetCommit,
    isCurrent: Boolean(b.isCurrent),
    isRemote: Boolean(b.isRemote),
    isBase: Boolean(b.isBase),
    baseBranch: b.baseBranch,
    parentBranch: b.parentBranch,
    forkPoint: b.forkPoint,
    mergedInto: b.mergedInto,
    mergeCommit: b.mergeCommit,
    status: b.status,
    mergedCount: b.mergedCount || 0,
    unmergedCount: b.unmergedCount || 0,
    aheadCount: b.aheadCount || 0,
    behindCount: b.behindCount || 0,
    commonCount: b.commonCount || 0,
    children: b.children || [],
    mergedChildren: b.mergedChildren || [],
    unmergedCommits: (b.unmergedCommits || []).map((c) => {
      const parsed = parseCommit(`${c.subject || ''}\n\n${c.body || ''}`);
      return {
        hash: c.hash,
        subject: c.subject,
        author: c.author,
        body: c.body || parsed.body || '',
        date: c.date instanceof Date ? c.date.toISOString() : c.date,
        isMerge: Boolean(c.isMerge),
        type: parsed.type,
        isRelevant: RELEVANT_TYPES.has(parsed.type) || Boolean(c.isMerge),
        isConventional: Boolean(parsed.type),
      };
    }),
    behindCommits: (b.behindCommits || []).map((c) => {
      const parsed = parseCommit(`${c.subject || ''}\n\n${c.body || ''}`);
      return {
        hash: c.hash,
        subject: c.subject,
        author: c.author,
        body: c.body || parsed.body || '',
        date: c.date instanceof Date ? c.date.toISOString() : c.date,
        isMerge: Boolean(c.isMerge),
        type: parsed.type,
        isRelevant: RELEVANT_TYPES.has(parsed.type) || Boolean(c.isMerge),
        isConventional: Boolean(parsed.type),
      };
    }),
    mergedCommits: (b.mergedCommits || []).map((c) => {
      const parsed = parseCommit(`${c.subject || ''}\n\n${c.body || ''}`);
      return {
        hash: c.hash,
        subject: c.subject,
        author: c.author,
        body: c.body || parsed.body || '',
        date: c.date instanceof Date ? c.date.toISOString() : c.date,
        isMerge: Boolean(c.isMerge),
        type: parsed.type,
        isRelevant: RELEVANT_TYPES.has(parsed.type) || Boolean(c.isMerge),
        isConventional: Boolean(parsed.type),
      };
    }),
    commits: (b.commits || []).map((c) => {
      const parsed = parseCommit(`${c.subject || ''}\n\n${c.body || ''}`);
      return {
        hash: c.hash,
        subject: c.subject,
        author: c.author,
        body: c.body || parsed.body || '',
        date: c.date instanceof Date ? c.date.toISOString() : c.date,
        isMerge: Boolean(c.isMerge),
        type: parsed.type,
        isRelevant: RELEVANT_TYPES.has(parsed.type) || Boolean(c.isMerge),
        isConventional: Boolean(parsed.type),
      };
    }),
  }));

  const payload = {
    topology: {
      baseBranch: topologyData.baseBranch || 'main',
      branches: serializableBranches,
      summary: topologyData.summary || {},
    },
    collaborators: collaboratorsData || { global: [], branches: {} },
    dagNodes,
    merges: topologyData.merges || [],
    mergeSummaries,
    options: {
      verbose: Boolean(options.verbose),
      lang: options.lang || 'es',
      langExplicit: Boolean(options.langExplicit),
      remoteUrl: options.remoteUrl || '',
    },
  };

  const jsonString = JSON.stringify(payload);

  // Reemplazar etiqueta de datos incrustados
  const scriptRegex = /<script\s+id="gitdoc-data"\s+type="application\/json">[\s\S]*?<\/script>/;
  const replacement = `<script id="gitdoc-data" type="application/json">\n${jsonString}\n  </script>`;

  if (scriptRegex.test(templateHtml)) {
    templateHtml = templateHtml.replace(scriptRegex, replacement);
  } else {
    templateHtml = templateHtml.replace('</body>', `${replacement}\n</body>`);
  }

  // Configurar idioma inicial
  const lang = options.lang === 'en' ? 'en' : 'es';
  templateHtml = templateHtml.replace(/<html\s+lang="[^"]*"/, `<html lang="${lang}"`);

  return templateHtml;
}

export const renderHtmlViewer = generateHtmlViewer;
