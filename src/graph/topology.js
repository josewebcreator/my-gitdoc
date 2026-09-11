import { getAllBranches, getMergeBase, getCommitsDag } from '../git.js';
import { t } from '../i18n/index.js';
import pc from 'picocolors';

/**
 * @typedef {Object} CommitNode
 * @property {string} hash
 * @property {string[]} parents
 * @property {string[]} children
 * @property {string} author
 * @property {string} email
 * @property {number} timestamp
 * @property {Date} date
 * @property {string} subject
 * @property {boolean} isMerge
 * @property {Set<string>} branches
 */

/**
 * Construye un Grafo Acíclico Dirigido (DAG) indexado por hash en memoria.
 * @param {Iterable<Object>|Array<Object>} commits
 * @returns {Map<string, CommitNode>}
 */
export function buildDag(commits) {
  const dag = new Map();

  // Primera pasada: registrar nodos
  for (const c of commits) {
    dag.set(c.hash, {
      hash: c.hash,
      parents: Array.isArray(c.parents) ? [...c.parents] : [],
      children: [],
      author: c.author || '',
      email: c.email || '',
      timestamp: typeof c.timestamp === 'number' ? c.timestamp : 0,
      date: c.date instanceof Date ? c.date : new Date((c.timestamp || 0) * 1000),
      subject: c.subject || '',
      isMerge: Boolean(c.isMerge || (c.parents && c.parents.length > 1)),
      branches: new Set(),
    });
  }

  // Segunda pasada: conectar hijos
  for (const [hash, node] of dag.entries()) {
    for (const parentHash of node.parents) {
      const parentNode = dag.get(parentHash);
      if (parentNode && !parentNode.children.includes(hash)) {
        parentNode.children.push(hash);
      }
    }
  }

  return dag;
}

class MaxHeap {
  constructor() {
    this.data = [];
  }
  push(item) {
    this.data.push(item);
    this._up(this.data.length - 1);
  }
  pop() {
    if (this.data.length === 0) return null;
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this._down(0);
    }
    return top;
  }
  size() {
    return this.data.length;
  }
  _up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.data[i].timestamp > this.data[p].timestamp) {
        const tmp = this.data[i];
        this.data[i] = this.data[p];
        this.data[p] = tmp;
        i = p;
      } else {
        break;
      }
    }
  }
  _down(i) {
    const len = this.data.length;
    while ((i << 1) + 1 < len) {
      let best = (i << 1) + 1;
      const right = best + 1;
      if (right < len && this.data[right].timestamp > this.data[best].timestamp) {
        best = right;
      }
      if (this.data[best].timestamp > this.data[i].timestamp) {
        const tmp = this.data[i];
        this.data[i] = this.data[best];
        this.data[best] = tmp;
        i = best;
      } else {
        break;
      }
    }
  }
}

/**
 * Obtiene el conjunto de todos los ancestros de un hash en el DAG.
 * @param {string} hash
 * @param {Map<string, CommitNode>} dag
 * @returns {Set<string>}
 */
export function getAllAncestors(hash, dag) {
  const ancestors = new Set();
  if (!hash || !dag.has(hash)) return ancestors;
  const queue = [hash];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (!ancestors.has(cur)) {
      ancestors.add(cur);
      const node = dag.get(cur);
      if (node && node.parents) {
        for (const p of node.parents) {
          if (!ancestors.has(p)) queue.push(p);
        }
      }
    }
  }
  return ancestors;
}

/**
 * Determina si targetHash es alcanzable desde fromHash navegando por los padres.
 * @param {string} fromHash
 * @param {string} targetHash
 * @param {Map<string, CommitNode>} dag
 * @returns {boolean}
 */
export function isAncestor(targetHash, fromHash, dag) {
  if (!fromHash || !targetHash || !dag.has(fromHash) || !dag.has(targetHash)) {
    return false;
  }
  if (fromHash === targetHash) return true;

  const queue = [fromHash];
  const visited = new Set();

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    if (current === targetHash) return true;

    const node = dag.get(current);
    if (node && node.parents) {
      for (const p of node.parents) {
        if (!visited.has(p)) {
          queue.push(p);
        }
      }
    }
  }

  return false;
}

/**
 * Calcula el ancestro común más bajo (LCA) en el DAG en memoria.
 * @param {string} hashA
 * @param {string} hashB
 * @param {Map<string, CommitNode>} dag
 * @param {Set<string>} [precomputedAncestorsA=null]
 * @returns {string|null}
 */
export function findLcaInDag(hashA, hashB, dag, precomputedAncestorsA = null) {
  if (!hashA || !hashB || !dag.has(hashA) || !dag.has(hashB)) {
    return null;
  }
  if (hashA === hashB) return hashA;

  const ancestorsA = precomputedAncestorsA || getAllAncestors(hashA, dag);

  // Recorrer desde hashB hacia atrás usando MaxHeap por timestamp
  const heap = new MaxHeap();
  const visitedB = new Set();

  const startNodeB = dag.get(hashB);
  if (startNodeB) {
    heap.push({ hash: hashB, timestamp: startNodeB.timestamp || 0 });
    visitedB.add(hashB);
  }

  while (heap.size() > 0) {
    const top = heap.pop();
    if (ancestorsA.has(top.hash)) {
      return top.hash;
    }

    const node = dag.get(top.hash);
    if (node && node.parents) {
      for (const p of node.parents) {
        if (!visitedB.has(p)) {
          visitedB.add(p);
          const pNode = dag.get(p);
          heap.push({ hash: p, timestamp: pNode?.timestamp || 0 });
        }
      }
    }
  }

  return null;
}

/**
 * Obtiene los commits alcanzables desde fromHash deteniéndose en stopHash (excluyendo stopHash).
 * @param {string} fromHash
 * @param {string|null} stopHash
 * @param {Map<string, CommitNode>} dag
 * @returns {CommitNode[]}
 */
export function getBranchCommits(fromHash, stopHash, dag) {
  if (!fromHash || !dag.has(fromHash)) return [];

  const commits = [];
  const queue = [fromHash];
  const visited = new Set();

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    if (stopHash && current === stopHash) {
      continue;
    }

    const node = dag.get(current);
    if (!node) continue;

    commits.push(node);

    if (node.parents) {
      for (const p of node.parents) {
        if (!visited.has(p) && p !== stopHash) {
          queue.push(p);
        }
      }
    }
  }

  // Ordenar cronológicamente descendente (más reciente primero)
  commits.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return commits;
}

/**
 * Detecta dinámicamente la rama base principal del repositorio.
 * @param {Array<Object>} branches
 * @param {Object} options
 * @returns {string}
 */
export function detectBaseBranch(branches = [], options = {}) {
  if (options.baseBranch) {
    if (branches.length === 0) return options.baseBranch;
    const requested = options.baseBranch.toLowerCase();
    let match = branches.find((b) => b.name.toLowerCase() === requested);
    if (!match) {
      match = branches.find((b) => b.name.toLowerCase().includes(requested));
    }
    if (match) return match.name;
    throw new Error(t('topology.errors.branchNotFound', { branch: options.baseBranch }));
  }

  const branchNames = branches.map((b) => b.name);

  const preferred = ['main', 'master', 'develop', 'dev'];
  for (const pref of preferred) {
    if (branchNames.includes(pref)) return pref;
  }

  // Si ninguna de las estándar existe, seleccionar la rama con commit más reciente
  if (branches.length > 0) {
    const sorted = [...branches].sort((a, b) => (b.isCurrent ? 1 : 0) - (a.isCurrent ? 1 : 0));
    return sorted[0].name;
  }

  return 'main';
}

/**
 * Extrae la topología completa de ramas, bifurcaciones, merges y commits asociados.
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export function analyzeTopologyData(branches, rawCommits, options = {}) {
  const dag = buildDag(rawCommits);
  const baseBranchName = detectBaseBranch(branches, options);
  const baseBranchObj = branches.find((b) => b.name === baseBranchName) || {
    name: baseBranchName,
    targetCommit: branches[0]?.targetCommit || '',
    isCurrent: false,
    isRemote: false,
  };

  const baseTip = baseBranchObj.targetCommit;
  const merges = [];

  // Indexar merges en el grafo
  for (const node of dag.values()) {
    if (node.isMerge) {
      merges.push({
        hash: node.hash,
        parents: node.parents,
        author: node.author,
        email: node.email,
        date: node.date,
        subject: node.subject,
      });
    }
  }

  // Precalcular conjunto de ancestros para cada rama
  const branchAncestorsMap = new Map();
  for (const b of branches) {
    if (b.targetCommit) {
      const anc = getAllAncestors(b.targetCommit, dag);
      anc.add(b.targetCommit);
      branchAncestorsMap.set(b.name, anc);
    } else {
      branchAncestorsMap.set(b.name, new Set());
    }
  }

  const baseAncestors = branchAncestorsMap.get(baseBranchName) || new Set();

  const trunkNames = ['main', 'master', 'develop', 'dev', 'trunk'];
  const isTrunk = (name) => trunkNames.includes(String(name).toLowerCase());

  // Fase 1: Identificar mergedInto y mergeCommit para cada rama
  const mergeInfoMap = new Map();
  for (const b of branches) {
    if (!b.targetCommit) {
      mergeInfoMap.set(b.name, { mergedInto: null, mergeCommit: null });
      continue;
    }

    let mergedInto = null;
    let mergeCommit = null;

    // Buscar entre las otras ramas aquellas cuya historia contiene el tip de b
    const candidateTargets = branches.filter((other) => {
      if (other.name === b.name) return false;
      const otherAncestors = branchAncestorsMap.get(other.name);
      return otherAncestors && otherAncestors.has(b.targetCommit);
    });

    if (candidateTargets.length > 0) {
      // 1. Verificar si hay un merge commit explícito en alguna rama candidata
      for (const m of merges) {
        const isMergedInM = m.parents.slice(1).some((p) => p === b.targetCommit || isAncestor(b.targetCommit, p, dag));
        if (isMergedInM) {
          const containingTargets = candidateTargets.filter((t) => {
            const tAncestors = branchAncestorsMap.get(t.name);
            return tAncestors && tAncestors.has(m.hash);
          });
          if (containingTargets.length > 0) {
            containingTargets.sort((t1, t2) => {
              const t1Trunk = isTrunk(t1.name) ? 1 : 0;
              const t2Trunk = isTrunk(t2.name) ? 1 : 0;
              if (t1Trunk !== t2Trunk) return t2Trunk - t1Trunk;
              const d1 = getBranchCommits(t1.targetCommit, m.hash, dag).length;
              const d2 = getBranchCommits(t2.targetCommit, m.hash, dag).length;
              return d1 - d2;
            });
            mergedInto = containingTargets[0].name;
            mergeCommit = m.hash;
            break;
          }
        }
      }

      // 2. Si no hubo merge commit explícito (fast-forward merge)
      // Una rama troncal o base NUNCA se fusiona vía fast-forward en una rama de características
      if (!mergedInto && !isTrunk(b.name) && b.name !== baseBranchName) {
        const validTargets = candidateTargets.filter((t) => isTrunk(t.name) || t.name === baseBranchName);
        const targetsToConsider = validTargets.length > 0 ? validTargets : candidateTargets;

        targetsToConsider.sort((t1, t2) => {
          const t1Trunk = isTrunk(t1.name) ? 1 : 0;
          const t2Trunk = isTrunk(t2.name) ? 1 : 0;
          if (t1Trunk !== t2Trunk) return t2Trunk - t1Trunk;
          const d1 = getBranchCommits(t1.targetCommit, b.targetCommit, dag).length;
          const d2 = getBranchCommits(t2.targetCommit, b.targetCommit, dag).length;
          return d1 - d2;
        });
        mergedInto = targetsToConsider[0].name;
      }
    }

    mergeInfoMap.set(b.name, { mergedInto, mergeCommit });
  }

  // Fase 2: Identificar parentBranch y forkPoint para cada rama
  const parentInfoMap = new Map();
  for (const b of branches) {
    const isRootCandidate = b.name === 'main' || (b.name === 'master' && !branches.some((x) => x.name === 'main'));
    if (isRootCandidate && !mergeInfoMap.get(b.name)?.mergedInto) {
      parentInfoMap.set(b.name, { parentBranch: null, forkPoint: null });
      continue;
    }

    const { mergedInto, mergeCommit } = mergeInfoMap.get(b.name) || {};
    let parentBranch = null;
    let forkPoint = null;

    if (mergedInto && mergeCommit) {
      const mNode = dag.get(mergeCommit);
      if (mNode && mNode.parents.length >= 2) {
        forkPoint = findLcaInDag(mNode.parents[0], b.targetCommit, dag);
      }
      parentBranch = mergedInto;
    } else if (mergedInto) {
      // Rama con fast-forward merge: su rama padre de integración es mergedInto
      parentBranch = mergedInto;

      // Buscar el forkPoint: el commit de la rama antecesora más reciente en el tiempo
      let closestAncestor = null;
      let maxTs = -1;
      for (const other of branches) {
        if (other.name === b.name) continue;
        if (other.targetCommit === b.targetCommit) continue;
        if (isAncestor(other.targetCommit, b.targetCommit, dag)) {
          const node = dag.get(other.targetCommit);
          const ts = node?.timestamp || 0;
          if (ts > maxTs) {
            maxTs = ts;
            closestAncestor = other;
          }
        }
      }
      forkPoint = closestAncestor ? closestAncestor.targetCommit : null;
    } else {
      // Rama no fusionada: buscar la rama con el LCA más reciente en el DAG
      let bestCandidate = null;
      let bestLca = null;
      let bestScore = -1;

      for (const other of branches) {
        if (other.name === b.name) continue;
        // Si other se fusionó en b, other es una rama integrada en b, NO su padre
        if (mergeInfoMap.get(other.name)?.mergedInto === b.name) continue;

        const lca = findLcaInDag(b.targetCommit, other.targetCommit, dag, branchAncestorsMap.get(b.name));
        if (!lca) continue;
        // Si el LCA es el propio tip de b, other es descendiente de b (hija), no su padre
        if (lca === b.targetCommit) continue;

        const lcaNode = dag.get(lca);
        const lcaTs = lcaNode?.timestamp || 0;
        const isTrunkBranch = isTrunk(other.name) ? 1 : 0;
        const isBaseB = other.name === baseBranchName ? 1 : 0;
        const score = lcaTs * 100 + isTrunkBranch * 10 + isBaseB;

        if (score > bestScore) {
          bestScore = score;
          bestLca = lca;
          bestCandidate = other;
        }
      }

      if (bestCandidate) {
        parentBranch = bestCandidate.name;
        forkPoint = bestLca;
      }
    }

    parentInfoMap.set(b.name, { parentBranch, forkPoint });
  }

  // Fase 3: Construcción de datos por rama
  const analyzedBranches = [];
  for (const branch of branches) {
    const isBase = (branch.name === baseBranchName) || (parentInfoMap.get(branch.name)?.parentBranch === null && !mergeInfoMap.get(branch.name)?.mergedInto);
    const branchTip = branch.targetCommit;
    const { parentBranch, forkPoint } = parentInfoMap.get(branch.name) || { parentBranch: null, forkPoint: null };
    const { mergedInto, mergeCommit } = mergeInfoMap.get(branch.name) || { mergedInto: null, mergeCommit: null };

    let status = 'active';
    if (mergedInto) {
      status = 'merged';
    } else if (parentBranch) {
      const parentObj = branches.find((x) => x.name === parentBranch);
      if (parentObj && forkPoint) {
        if (forkPoint === parentObj.targetCommit) {
          status = 'active';
        } else {
          status = 'diverged';
        }
      } else {
        status = 'active';
      }
    }

    const branchCommits = isBase
      ? getBranchCommits(branchTip, null, dag)
      : getBranchCommits(branchTip, forkPoint, dag);

    for (const c of branchCommits) {
      c.branches.add(branch.name);
    }

    const targetRefAnc = mergedInto
      ? branchAncestorsMap.get(mergedInto)
      : (parentBranch ? branchAncestorsMap.get(parentBranch) : baseAncestors);

    const mergedCommits = branchCommits.filter((c) => targetRefAnc && targetRefAnc.has(c.hash));
    const unmergedCommits = branchCommits.filter((c) => !targetRefAnc || !targetRefAnc.has(c.hash));

    let behindCount = 0;
    let behindCommits = [];
    let commonCount = 0;
    if (forkPoint) {
      const parentObj = branches.find((x) => x.name === (parentBranch || baseBranchName));
      if (parentObj && parentObj.targetCommit) {
        behindCommits = getBranchCommits(parentObj.targetCommit, forkPoint, dag);
        behindCount = behindCommits.length;
      }
      commonCount = getBranchCommits(forkPoint, null, dag).length;
    } else if (isBase) {
      commonCount = branchCommits.length;
    } else if (mergedInto && branchTip !== baseTip) {
      behindCommits = getBranchCommits(baseTip, branchTip, dag);
      behindCount = behindCommits.length;
      commonCount = getBranchCommits(branchTip, null, dag).length;
    }

    analyzedBranches.push({
      name: branch.name,
      targetCommit: branchTip,
      isCurrent: Boolean(branch.isCurrent),
      isRemote: Boolean(branch.isRemote),
      isBase,
      baseBranch: baseBranchName,
      parentBranch,
      forkPoint,
      mergedInto,
      mergeCommit,
      status,
      commits: branchCommits,
      mergedCommits,
      unmergedCommits,
      behindCommits,
      mergedCount: mergedCommits.length,
      unmergedCount: unmergedCommits.length,
      aheadCount: unmergedCommits.length,
      behindCount,
      commonCount,
      children: [],
      mergedChildren: [],
    });
  }

  // Fase 4: Enlazar ramas hijas y ramas fusionadas
  for (const b of analyzedBranches) {
    b.children = analyzedBranches
      .filter((other) => other.name !== b.name && other.parentBranch === b.name)
      .map((other) => other.name);
    b.mergedChildren = analyzedBranches
      .filter((other) => other.name !== b.name && other.mergedInto === b.name)
      .map((other) => other.name);
  }

  // Aplicar filtros configurables
  let filteredBranches = analyzedBranches;

  // Filtro --branch (análisis de rama contra rama)
  if (options.branch) {
    const requested = options.branch.toLowerCase();
    const targetBranch = analyzedBranches.find(
      (b) => b.name.toLowerCase() === requested || b.name.toLowerCase().includes(requested)
    );
    if (!targetBranch) {
      throw new Error(t('topology.errors.branchNotFound', { branch: options.branch }));
    }

    // Análisis de una rama contra otra:
    // Incluir la rama objetivo, su rama base/padre de referencia, destino de merge y sus hijos directos
    const relevantNames = new Set([targetBranch.name]);

    if (targetBranch.parentBranch) {
      relevantNames.add(targetBranch.parentBranch);
    }
    if (baseBranchName) {
      relevantNames.add(baseBranchName);
    }
    if (targetBranch.mergedInto) {
      relevantNames.add(targetBranch.mergedInto);
    }
    if (Array.isArray(targetBranch.children)) {
      for (const child of targetBranch.children) {
        relevantNames.add(child);
      }
    }

    filteredBranches = analyzedBranches.filter((b) => relevantNames.has(b.name));
  }

  // Filtro --author
  if (options.author) {
    const authorPattern = options.author.toLowerCase();
    filteredBranches = filteredBranches.filter((b) => {
      const hasAuthorCommits = b.commits.some(
        (c) =>
          c.author.toLowerCase().includes(authorPattern) ||
          c.email.toLowerCase().includes(authorPattern)
      );
      if (!hasAuthorCommits) return false;

      b.commits = b.commits.filter(
        (c) =>
          c.author.toLowerCase().includes(authorPattern) ||
          c.email.toLowerCase().includes(authorPattern)
      );
      return b.commits.length > 0;
    });
  }

  // Filtro --since
  if (options.since) {
    let rawSince = String(options.since).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawSince)) {
      rawSince += 'T00:00:00.000Z';
    }
    const sinceDate = new Date(rawSince);
    if (isNaN(sinceDate.getTime())) {
      throw new Error(t('topology.errors.invalidDate', { date: options.since }));
    }
    for (const b of filteredBranches) {
      b.commits = b.commits.filter((c) => c.date >= sinceDate);
    }
  }

  // Filtro --until
  if (options.until) {
    let rawUntil = String(options.until).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawUntil)) {
      rawUntil += 'T23:59:59.999Z';
    }
    const untilDate = new Date(rawUntil);
    if (isNaN(untilDate.getTime())) {
      throw new Error(t('topology.errors.invalidDate', { date: options.until }));
    }
    for (const b of filteredBranches) {
      b.commits = b.commits.filter((c) => c.date <= untilDate);
    }
  }

  // Recalcular métricas de resumen
  const activeCount = filteredBranches.filter((b) => b.status === 'active').length;
  const mergedCount = filteredBranches.filter((b) => b.status === 'merged').length;
  const divergedCount = filteredBranches.filter((b) => b.status === 'diverged').length;
  const allUniqueCommits = new Set();
  for (const b of filteredBranches) {
    const targetRefAnc = b.mergedInto
      ? branchAncestorsMap.get(b.mergedInto)
      : (b.parentBranch ? branchAncestorsMap.get(b.parentBranch) : baseAncestors);
    b.mergedCommits = b.commits.filter((c) => targetRefAnc && targetRefAnc.has(c.hash));
    b.unmergedCommits = b.commits.filter((c) => !targetRefAnc || !targetRefAnc.has(c.hash));
    b.mergedCount = b.mergedCommits.length;
    b.unmergedCount = b.unmergedCommits.length;
    b.aheadCount = b.unmergedCount;
    for (const c of b.commits) {
      allUniqueCommits.add(c.hash);
    }
  }

  return {
    baseBranch: baseBranchName,
    branches: filteredBranches,
    allBranches: analyzedBranches,
    dag,
    merges,
    summary: {
      totalBranches: filteredBranches.length,
      activeBranches: activeCount,
      mergedBranches: mergedCount,
      divergedBranches: divergedCount,
      totalCommits: allUniqueCommits.size,
    },
  };
}

/**
 * Ejecuta la extracción topológica completa consultando directamente el repositorio Git.
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function extractTopology(options = {}) {
  const branches = await getAllBranches(options);
  const commitsList = [];

  const refs = options.from && options.to ? [`${options.from}..${options.to}`] : ['--all'];

  const gitOptions = { cwd: options.cwd };
  for await (const c of getCommitsDag(refs, gitOptions)) {
    commitsList.push(c);
  }

  return analyzeTopologyData(branches, commitsList, options);
}

/**
 * Imprime en terminal el reporte formateado de topología y colaboradores.
 * @param {Object} topo
 * @param {Object} metrics
 */
export function printTopologyReport(topo, metrics) {
  console.log(`\n${pc.bold(pc.cyan(t('cli.topology.header')))}`);
  console.log(`${pc.bold(t('cli.topology.baseBranch'))} ${pc.green(topo.baseBranch)}`);
  console.log(
    `${pc.bold(t('cli.topology.totalBranches'))} ${topo.summary.totalBranches} (${pc.green(
      t('cli.topology.activeCount', { count: topo.summary.activeBranches })
    )}, ${pc.blue(
      t('cli.topology.mergedCount', { count: topo.summary.mergedBranches })
    )}, ${pc.yellow(
      t('cli.topology.divergedCount', { count: topo.summary.divergedBranches })
    )})\n`
  );

  console.log(pc.bold(t('cli.topology.branchesHeading')));
  for (const b of topo.branches) {
    let statusBadge = pc.green(t('cli.topology.statusActive'));
    if (b.status === 'merged') statusBadge = pc.blue(t('cli.topology.statusMerged'));
    if (b.status === 'diverged') statusBadge = pc.yellow(t('cli.topology.statusDiverged'));

    let relationStr = '';
    if (b.parentBranch && b.forkPoint) {
      relationStr += t('cli.topology.forkedFrom', { parent: pc.bold(b.parentBranch), hash: pc.dim(b.forkPoint.substring(0, 7)) });
    } else if (b.forkPoint) {
      relationStr += t('cli.topology.forkedAt', { hash: pc.dim(b.forkPoint.substring(0, 7)) });
    }

    if (b.mergedInto) {
      relationStr += b.mergeCommit
        ? t('cli.topology.mergedIntoWithHash', { target: pc.bold(b.mergedInto), hash: pc.dim(b.mergeCommit.substring(0, 7)) })
        : t('cli.topology.mergedInto', { target: pc.bold(b.mergedInto) });
    } else if (b.mergeCommit) {
      relationStr += t('cli.topology.mergedIn', { hash: pc.dim(b.mergeCommit.substring(0, 7)) });
    }

    const isCurrentStr = b.isCurrent ? pc.cyan(' *') : '';

    if (b.isBase) {
      console.log(
        `  ${pc.bold(b.name)}${isCurrentStr} ${statusBadge}${relationStr} — ${t('cli.topology.commitsCount', {
          count: b.commits.length,
        })} (${t('cli.topology.baseLabel')})`
      );
      if (b.children && b.children.length > 0) {
        console.log(`    ${pc.dim(t('cli.topology.childrenLabel'))} ${b.children.join(', ')}`);
      }
      continue;
    }

    let summaryStr = '';
    if (b.status === 'merged') {
      summaryStr = t('cli.topology.mergedSummary', {
        count: pc.blue(b.mergedCount ?? 0),
        behind: pc.yellow(b.behindCount ?? 0),
      });
    } else if (b.status === 'diverged') {
      summaryStr = t('cli.topology.divergedSummary', {
        ahead: pc.yellow(b.aheadCount ?? 0),
        behind: pc.yellow(b.behindCount ?? 0),
        common: pc.green(b.commonCount ?? 0),
      });
    } else {
      summaryStr = t('cli.topology.activeSummary', {
        ahead: pc.yellow(b.aheadCount ?? 0),
        common: pc.green(b.commonCount ?? 0),
      });
    }

    console.log(
      `  ${pc.bold(b.name)}${isCurrentStr} ${statusBadge}${relationStr} — ${summaryStr}`
    );

    if (b.children && b.children.length > 0) {
      console.log(`    ${pc.dim(t('cli.topology.childrenLabel'))} ${b.children.join(', ')}`);
    }
    if (b.mergedChildren && b.mergedChildren.length > 0) {
      console.log(`    ${pc.dim(t('cli.topology.mergedChildrenLabel'))} ${b.mergedChildren.join(', ')}`);
    }

    const unmergedList = b.unmergedCommits || [];
    const mergedList = b.mergedCommits || [];

    if (unmergedList.length > 0) {
      console.log(
        `    ${pc.yellow(
          t('cli.topology.unmergedLabel', { base: topo.baseBranch, count: b.aheadCount ?? unmergedList.length })
        )}`
      );
      const preview = unmergedList.slice(0, 5);
      for (const c of preview) {
        console.log(`      • ${pc.dim(c.hash.substring(0, 7))} ${c.subject}`);
      }
      if (unmergedList.length > 5) {
        console.log(`      ${pc.dim(t('cli.topology.moreCommits', { count: unmergedList.length - 5 }))}`);
      }
    }

    if (mergedList.length > 0) {
      console.log(
        `    ${pc.blue(
          t('cli.topology.mergedLabel', { count: b.mergedCount ?? mergedList.length })
        )}`
      );
      const preview = mergedList.slice(0, 5);
      for (const c of preview) {
        console.log(`      • ${pc.dim(c.hash.substring(0, 7))} ${c.subject}`);
      }
      if (mergedList.length > 5) {
        console.log(`      ${pc.dim(t('cli.topology.moreCommits', { count: mergedList.length - 5 }))}`);
      }
    }
  }

  console.log(`\n${pc.bold(t('cli.topology.collaboratorsHeading'))}`);
  for (const col of metrics.global) {
    const typesStr = Object.entries(col.types)
      .map(([k, v]) => `${k}:${v}`)
      .join(', ');
    const scopesStr = col.scopes.length > 0 ? col.scopes.join(', ') : t('cli.topology.generalScope');
    console.log(
      `  • ${pc.bold(col.name)} ${pc.dim(`<${col.email}>`)}: ${pc.cyan(
        t('cli.topology.commitsCount', { count: col.commitsCount })
      )}`
    );
    if (typesStr) console.log(`    ${pc.dim(t('cli.topology.typesLabel'))} ${typesStr}`);
    console.log(`    ${pc.dim(t('cli.topology.scopesLabel'))} ${scopesStr}`);
    if (col.branches.length > 0)
      console.log(`    ${pc.dim(t('cli.topology.branchesLabel'))} ${col.branches.join(', ')}`);
  }
  console.log('');
}

