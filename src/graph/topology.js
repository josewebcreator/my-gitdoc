import { getAllBranches, getMergeBase, getCommitsDag } from '../git.js';
import { t } from '../i18n/index.js';

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
    const match = branches.find(
      (b) => b.name.toLowerCase() === options.baseBranch.toLowerCase()
    );
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
  const analyzedBranches = [];
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

  // Precalcular conjunto de ancestros de la rama base
  const baseAncestors = getAllAncestors(baseTip, dag);
  baseAncestors.add(baseTip);

  // Procesar rama base
  const baseCommits = getBranchCommits(baseTip, null, dag);
  for (const c of baseCommits) {
    c.branches.add(baseBranchName);
  }

  const baseAnalysis = {
    name: baseBranchName,
    targetCommit: baseTip,
    isCurrent: Boolean(baseBranchObj.isCurrent),
    isRemote: Boolean(baseBranchObj.isRemote),
    isBase: true,
    baseBranch: null,
    forkPoint: null,
    status: 'active',
    mergeCommit: null,
    commits: baseCommits,
  };
  analyzedBranches.push(baseAnalysis);

  // Procesar ramas secundarias
  for (const branch of branches) {
    if (branch.name === baseBranchName) continue;

    const branchTip = branch.targetCommit;
    let status = 'active';
    let forkPoint = null;
    let mergeCommit = null;

    // 1. Determinar si branchTip ya está integrada en la rama base (merged)
    const isMergedIntoBase = baseTip && branchTip && baseAncestors.has(branchTip);

    if (isMergedIntoBase) {
      status = 'merged';

      // Localizar el commit de merge en la historia de la base
      for (const m of merges) {
        if (baseAncestors.has(m.hash)) {
          const isMergedInM = m.parents.slice(1).some((p) => p === branchTip || isAncestor(branchTip, p, dag));
          if (isMergedInM) {
            mergeCommit = m.hash;
            forkPoint = findLcaInDag(m.parents[0], branchTip, dag);
            break;
          }
        }
      }

      if (!forkPoint) {
        forkPoint = findLcaInDag(baseTip, branchTip, dag, baseAncestors);
      }
    } else {
      // Rama no fusionada: calcular forkPoint respecto a baseTip
      forkPoint = findLcaInDag(baseTip, branchTip, dag, baseAncestors);

      if (!forkPoint || forkPoint === branchTip) {
        // La rama no tiene commits propios posteriores a la base
        status = 'active';
      } else if (forkPoint === baseTip) {
        // La rama está estrictamente por delante de la base
        status = 'active';
      } else {
        // La base y la rama secundaria tienen commits disjuntos tras el forkPoint
        status = 'diverged';
      }
    }

    // Obtener los commits propios de la rama (desde branchTip hasta forkPoint excluido)
    const branchCommits = getBranchCommits(branchTip, forkPoint, dag);
    for (const c of branchCommits) {
      c.branches.add(branch.name);
    }

    analyzedBranches.push({
      name: branch.name,
      targetCommit: branchTip,
      isCurrent: Boolean(branch.isCurrent),
      isRemote: Boolean(branch.isRemote),
      isBase: false,
      baseBranch: baseBranchName,
      forkPoint,
      status,
      mergeCommit,
      commits: branchCommits,
    });
  }

  // Aplicar filtros configurables
  let filteredBranches = analyzedBranches;

  // Filtro --branch
  if (options.branch) {
    const requested = options.branch.toLowerCase();
    filteredBranches = filteredBranches.filter(
      (b) => b.name.toLowerCase() === requested || b.name.toLowerCase().includes(requested)
    );
    if (filteredBranches.length === 0) {
      throw new Error(t('topology.errors.branchNotFound', { branch: options.branch }));
    }
  }

  // Filtro --author
  if (options.author) {
    const authorPattern = options.author.toLowerCase();
    filteredBranches = filteredBranches.filter((b) => {
      // Una rama se conserva si alguno de sus commits propios pertenece al autor
      const hasAuthorCommits = b.commits.some(
        (c) =>
          c.author.toLowerCase().includes(authorPattern) ||
          c.email.toLowerCase().includes(authorPattern)
      );
      if (!hasAuthorCommits) return false;

      // Filtrar también los commits internos de la rama
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
    const sinceDate = new Date(options.since);
    if (isNaN(sinceDate.getTime())) {
      throw new Error(t('topology.errors.invalidDate', { date: options.since }));
    }
    for (const b of filteredBranches) {
      b.commits = b.commits.filter((c) => c.date >= sinceDate);
    }
  }

  // Filtro --until
  if (options.until) {
    const untilDate = new Date(options.until);
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
    for (const c of b.commits) {
      allUniqueCommits.add(c.hash);
    }
  }

  return {
    baseBranch: baseBranchName,
    branches: filteredBranches,
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

  for await (const c of getCommitsDag(refs, options)) {
    commitsList.push(c);
  }

  return analyzeTopologyData(branches, commitsList, options);
}
