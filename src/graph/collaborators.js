import { parseCommit } from '../parser.js';

/**
 * @typedef {Object} CollaboratorStats
 * @property {string} name
 * @property {string} email
 * @property {number} commitsCount
 * @property {Date|null} firstCommitDate
 * @property {Date|null} lastCommitDate
 * @property {Record<string, number>} types
 * @property {string[]} scopes
 * @property {string|null} primaryType
 * @property {string|null} primaryScope
 * @property {string[]} [branches]
 */

/**
 * @typedef {Object} BranchCollaborators
 * @property {string} branch
 * @property {number} totalCommits
 * @property {number} authorsCount
 * @property {CollaboratorStats[]} collaborators
 */

/**
 * Analiza los colaboradores, volumen de commits, rangos temporales y scopes de Conventional Commits.
 * @param {Object} topologyResult - Resultado retornado por extractTopology o analyzeTopologyData
 * @param {Object} [options={}]
 * @returns {Object}
 */
export function analyzeCollaborators(topologyResult, options = {}) {
  const branches = topologyResult?.branches || [];
  const branchMetrics = [];
  const globalAuthorsMap = new Map();

  for (const b of branches) {
    const commits = b.commits || [];
    const authorsMap = new Map();

    for (const c of commits) {
      const authorName = (c.author || 'Unknown').trim();
      const authorEmail = (c.email || '').trim();
      const authorKey = authorEmail ? `${authorName} <${authorEmail}>` : authorName;

      // 1. Estadísticas locales de la rama
      if (!authorsMap.has(authorKey)) {
        authorsMap.set(authorKey, {
          name: authorName,
          email: authorEmail,
          commitsCount: 0,
          firstCommitDate: null,
          lastCommitDate: null,
          typesCount: {},
          scopesCount: {},
        });
      }

      const authorStats = authorsMap.get(authorKey);
      authorStats.commitsCount += 1;

      const commitDate = c.date instanceof Date ? c.date : new Date(c.timestamp * 1000);
      if (!isNaN(commitDate.getTime())) {
        if (!authorStats.firstCommitDate || commitDate < authorStats.firstCommitDate) {
          authorStats.firstCommitDate = commitDate;
        }
        if (!authorStats.lastCommitDate || commitDate > authorStats.lastCommitDate) {
          authorStats.lastCommitDate = commitDate;
        }
      }

      // Parsear Conventional Commits para types y scopes
      const parsed = parseCommit(c.subject);
      if (parsed.type) {
        authorStats.typesCount[parsed.type] = (authorStats.typesCount[parsed.type] || 0) + 1;
      }
      if (parsed.scope) {
        authorStats.scopesCount[parsed.scope] = (authorStats.scopesCount[parsed.scope] || 0) + 1;
      }

      // 2. Estadísticas globales
      if (!globalAuthorsMap.has(authorKey)) {
        globalAuthorsMap.set(authorKey, {
          name: authorName,
          email: authorEmail,
          commitsCount: 0,
          firstCommitDate: null,
          lastCommitDate: null,
          typesCount: {},
          scopesCount: {},
          branches: new Set(),
        });
      }

      const globalStats = globalAuthorsMap.get(authorKey);
      globalStats.commitsCount += 1;
      globalStats.branches.add(b.name);

      if (!isNaN(commitDate.getTime())) {
        if (!globalStats.firstCommitDate || commitDate < globalStats.firstCommitDate) {
          globalStats.firstCommitDate = commitDate;
        }
        if (!globalStats.lastCommitDate || commitDate > globalStats.lastCommitDate) {
          globalStats.lastCommitDate = commitDate;
        }
      }

      if (parsed.type) {
        globalStats.typesCount[parsed.type] = (globalStats.typesCount[parsed.type] || 0) + 1;
      }
      if (parsed.scope) {
        globalStats.scopesCount[parsed.scope] = (globalStats.scopesCount[parsed.scope] || 0) + 1;
      }
    }

    // Formatear lista de colaboradores de la rama
    const collaborators = Array.from(authorsMap.values()).map((stat) => {
      const primaryType = getHighestKey(stat.typesCount);
      const primaryScope = getHighestKey(stat.scopesCount);

      return {
        name: stat.name,
        email: stat.email,
        commitsCount: stat.commitsCount,
        firstCommitDate: stat.firstCommitDate,
        lastCommitDate: stat.lastCommitDate,
        types: stat.typesCount,
        scopes: Object.keys(stat.scopesCount),
        primaryType,
        primaryScope,
      };
    });

    // Ordenar por volumen de commits
    collaborators.sort((a, b) => b.commitsCount - a.commitsCount);

    branchMetrics.push({
      branch: b.name,
      status: b.status,
      isBase: b.isBase,
      totalCommits: commits.length,
      authorsCount: collaborators.length,
      collaborators,
    });
  }

  // Formatear resumen global de colaboradores
  const globalCollaborators = Array.from(globalAuthorsMap.values()).map((stat) => {
    const primaryType = getHighestKey(stat.typesCount);
    const primaryScope = getHighestKey(stat.scopesCount);

    return {
      name: stat.name,
      email: stat.email,
      commitsCount: stat.commitsCount,
      firstCommitDate: stat.firstCommitDate,
      lastCommitDate: stat.lastCommitDate,
      types: stat.typesCount,
      scopes: Object.keys(stat.scopesCount),
      primaryType,
      primaryScope,
      branches: Array.from(stat.branches),
    };
  });

  globalCollaborators.sort((a, b) => b.commitsCount - a.commitsCount);

  return {
    byBranch: branchMetrics,
    global: globalCollaborators,
    summary: {
      totalUniqueAuthors: globalCollaborators.length,
      totalAnalyzedBranches: branchMetrics.length,
    },
  };
}

/**
 * Obtiene la clave con mayor valor numérico en un objeto record.
 * @param {Record<string, number>} counts
 * @returns {string|null}
 */
function getHighestKey(counts) {
  let highestKey = null;
  let max = -1;

  for (const [key, val] of Object.entries(counts)) {
    if (val > max) {
      max = val;
      highestKey = key;
    }
  }

  return highestKey;
}
