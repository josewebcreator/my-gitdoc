import pc from 'picocolors';
import { t } from '../i18n/index.js';

/**
 * Genera la representación en árbol Unicode y colores ANSI para la consola.
 *
 * @param {Object} topologyData - Datos de topología retornados por extractTopology
 * @param {Object} [metrics={}] - Datos de colaboradores retornados por analyzeCollaborators
 * @param {Object} [options={}]
 * @returns {string} Texto formateado con caracteres Unicode y códigos de color ANSI
 */
export function formatTerminalTree(topologyData, metrics = {}, options = {}) {
  const i18n = options.i18nInstance || null;
  const translate = (key, params) => (i18n ? i18n.t(key, params) : t(key, params));

  const baseBranchName = topologyData?.baseBranch || 'main';
  const branches = topologyData?.branches || [];
  const branchMetrics = metrics?.byBranch || [];
  const branchMetricsMap = new Map();
  for (const bm of branchMetrics) {
    branchMetricsMap.set(bm.branch, bm);
  }

  const lines = [];
  lines.push('');
  lines.push(pc.bold(pc.cyan(translate('graph.terminalTitle'))));

  // Rama base como raíz del árbol
  const baseBranchObj = branches.find(b => b.isBase || b.name === baseBranchName);
  const baseCommitsCount = baseBranchObj?.commits ? baseBranchObj.commits.length : 0;
  const baseLabel = pc.dim(`[${translate('graph.terminalBase')}]`);

  const baseBm = branchMetricsMap.get(baseBranchName);
  let baseAuthors = '';
  if (baseBm && baseBm.collaborators && baseBm.collaborators.length > 0) {
    const names = baseBm.collaborators.slice(0, 2).map(c => c.name).join(', ');
    baseAuthors = pc.dim(` (👤 ${names})`);
  }

  lines.push(`📌 ${pc.bold(pc.white(baseBranchName))} ${pc.green(`(${baseCommitsCount} commits)`)} ${baseLabel}${baseAuthors}`);

  // Ramas secundarias
  const nonBaseBranches = branches.filter(b => !b.isBase && b.name !== baseBranchName);

  nonBaseBranches.forEach((b, index) => {
    const isLast = index === nonBaseBranches.length - 1;
    const branchPrefix = isLast ? '   └─ ' : '   ├─ ';
    const childPrefix  = isLast ? '      ' : '   │  ';

    // Estado con color
    let statusBadge = pc.green(`[${translate('graph.statusActive')}]`);
    let branchColoredName = pc.bold(pc.green(b.name));

    if (b.status === 'merged') {
      statusBadge = pc.cyan(`[${translate('graph.statusMerged')}]`);
      branchColoredName = pc.bold(pc.cyan(b.name));
    } else if (b.status === 'diverged') {
      statusBadge = pc.yellow(`[${translate('graph.statusDiverged')}]`);
      branchColoredName = pc.bold(pc.yellow(b.name));
    }

    const bm = branchMetricsMap.get(b.name);
    const totalCommits = b.commits ? b.commits.length : (bm?.totalCommits ?? 0);
    const commitsCountStr = pc.dim(`(${totalCommits} commits)`);

    let authorsStr = '';
    if (bm && Array.isArray(bm.collaborators) && bm.collaborators.length > 0) {
      const names = bm.collaborators.slice(0, 3).map(c => c.name).join(', ');
      authorsStr = pc.dim(` (👤 ${names})`);
    }

    let diffInfo = '';
    if (b.status === 'diverged') {
      diffInfo = pc.yellow(` [${b.aheadCount ?? 0} ahead, ${b.behindCount ?? 0} behind]`);
    } else if (b.status === 'active' && b.aheadCount) {
      diffInfo = pc.green(` [${b.aheadCount} ahead]`);
    }

    lines.push(`${branchPrefix}${branchColoredName} ${commitsCountStr} ${statusBadge}${diffInfo}${authorsStr}`);

    // Previsualización de commits (unmerged o recientes)
    const commitList = (b.unmergedCommits && b.unmergedCommits.length > 0)
      ? b.unmergedCommits
      : (b.commits || []);

    const preview = commitList.slice(0, 3);
    preview.forEach((c, cIdx) => {
      const isLastCommit = cIdx === preview.length - 1 && commitList.length <= 3;
      const cPrefix = isLastCommit ? '└─ ' : '├─ ';
      const shortHash = pc.dim(c.hash ? c.hash.substring(0, 7) : 'commit');
      const subject = c.subject ? (c.subject.length > 45 ? c.subject.substring(0, 42) + '...' : c.subject) : '';
      lines.push(`${childPrefix}${cPrefix}• ${shortHash} ${subject}`);
    });

    if (commitList.length > 3) {
      lines.push(`${childPrefix}└─ ${pc.dim(translate('cli.topology.moreCommits', { count: commitList.length - 3 }))}`);
    }
  });

  lines.push('');
  return lines.join('\n');
}

/**
 * Imprime directamente el árbol en la salida estándar de consola.
 *
 * @param {Object} topologyData
 * @param {Object} [metrics={}]
 * @param {Object} [options={}]
 */
export function printTerminalTree(topologyData, metrics = {}, options = {}) {
  const tree = formatTerminalTree(topologyData, metrics, options);
  console.log(tree);
}
