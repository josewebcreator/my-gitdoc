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

  const visitedBranches = new Set();

  // Función recursiva para renderizar una rama y sus ramas descendientes
  function renderBranchNode(b, prefix, isLast, isRoot = false) {
    visitedBranches.add(b.name);

    const bm = branchMetricsMap.get(b.name);
    const totalCommits = b.commits ? b.commits.length : (bm?.totalCommits ?? 0);
    const commitsCountStr = pc.dim(`(${totalCommits} commits)`);

    let authorsStr = '';
    if (bm && Array.isArray(bm.collaborators) && bm.collaborators.length > 0) {
      const names = bm.collaborators.slice(0, 3).map((c) => c.name).join(', ');
      authorsStr = pc.dim(` (👤 ${names})`);
    }

    if (isRoot) {
      const baseLabel = pc.dim(`[${translate('graph.terminalBase')}]`);
      lines.push(
        `📌 ${pc.bold(pc.white(b.name))} ${pc.green(`(${totalCommits} commits)`)} ${baseLabel}${authorsStr}`
      );
    } else {
      const branchPrefix = prefix + (isLast ? '└─ ' : '├─ ');
      let statusBadge = pc.green(`[${translate('graph.statusActive')}]`);
      let branchColoredName = pc.bold(pc.green(b.name));

      if (b.status === 'merged') {
        statusBadge = pc.cyan(`[${translate('graph.statusMerged')}]`);
        branchColoredName = pc.bold(pc.cyan(b.name));
      } else if (b.status === 'diverged') {
        statusBadge = pc.yellow(`[${translate('graph.statusDiverged')}]`);
        branchColoredName = pc.bold(pc.yellow(b.name));
      }

      let diffInfo = '';
      if (b.status === 'diverged') {
        diffInfo = pc.yellow(` [${b.aheadCount ?? 0} ahead, ${b.behindCount ?? 0} behind]`);
      } else if (b.status === 'active' && b.aheadCount) {
        diffInfo = pc.green(` [${b.aheadCount} ahead]`);
      }

      let mergeTargetInfo = '';
      if (b.status === 'merged' && b.mergedInto) {
        mergeTargetInfo = pc.dim(` (↳ ${b.mergedInto})`);
      }

      lines.push(
        `${branchPrefix}${branchColoredName} ${commitsCountStr} ${statusBadge}${diffInfo}${mergeTargetInfo}${authorsStr}`
      );

      // Previsualización de commits
      const nextChildPrefix = prefix + (isLast ? '   ' : '│  ');
      const commitList =
        b.unmergedCommits && b.unmergedCommits.length > 0
          ? b.unmergedCommits
          : b.commits || [];

      // Buscar ramas hijas de b
      const directChildren = branches.filter(
        (other) => other.name !== b.name && !visitedBranches.has(other.name) && other.parentBranch === b.name
      );

      const preview = commitList.slice(0, 3);
      const hasChildren = directChildren.length > 0;

      preview.forEach((c, cIdx) => {
        const isLastCommit = cIdx === preview.length - 1 && commitList.length <= 3 && !hasChildren;
        const cPrefix = isLastCommit ? '└─ ' : '├─ ';
        const shortHash = pc.dim(c.hash ? c.hash.substring(0, 7) : 'commit');
        const subject = c.subject
          ? c.subject.length > 45
            ? c.subject.substring(0, 42) + '...'
            : c.subject
          : '';
        lines.push(`${nextChildPrefix}${cPrefix}• ${shortHash} ${subject}`);
      });

      if (commitList.length > 3) {
        const morePrefix = !hasChildren ? '└─ ' : '├─ ';
        lines.push(
          `${nextChildPrefix}${morePrefix}${pc.dim(
            translate('cli.topology.moreCommits', { count: commitList.length - 3 })
          )}`
        );
      }
    }

    // Renderizar ramas hijas directas
    const childPrefix = isRoot ? '   ' : prefix + (isLast ? '   ' : '│  ');
    const children = branches.filter((other) => {
      if (other.name === b.name || visitedBranches.has(other.name)) return false;
      if (other.parentBranch) return other.parentBranch === b.name;
      // Compatibilidad hacia atrás: si no tiene parentBranch y no es base, asociar a la rama base
      return isRoot && !other.isBase && other.name !== baseBranchName;
    });

    children.forEach((child, idx) => {
      const isLastItem = idx === children.length - 1;
      renderBranchNode(child, childPrefix, isLastItem, false);
    });
  }

  // 1. Identificar rama base principal
  const baseBranchObj = branches.find((b) => b.isBase || b.name === baseBranchName) || branches[0];
  if (baseBranchObj) {
    renderBranchNode(baseBranchObj, '', true, true);
  }

  // 2. Renderizar cualquier rama huérfana no conectada
  for (const b of branches) {
    if (!visitedBranches.has(b.name)) {
      renderBranchNode(b, '   ', true, false);
    }
  }

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
