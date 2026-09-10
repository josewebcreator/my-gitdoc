import { t } from '../i18n/index.js';

/**
 * Sanitiza texto para su inclusión segura en diagramas Mermaid.
 * Escapa comillas, corchetes, paréntesis, símbolos numeral y caracteres de control (RNF-9).
 *
 * @param {string|null|undefined} text
 * @returns {string}
 */
export function sanitizeMermaidText(text) {
  if (typeof text !== 'string') return '';

  return text
    .replace(/[\r\n\t]+/g, ' ')           // Reemplazar saltos y tabulaciones por espacios
    .replace(/"/g, "'")                   // Reemplazar comillas dobles por comillas simples
    .replace(/[\[\]]/g, ' ')              // Reemplazar corchetes para no romper etiquetas Mermaid
    .replace(/[<]/g, '&lt;')              // Evitar tags HTML no deseados
    .replace(/[>]/g, '&gt;')
    .replace(/\\/g, '/')                  // Evitar caracteres de escape conflictivos
    .trim();
}

/**
 * Sanitiza y trunca mensajes de commit para Mermaid gitGraph.
 *
 * @param {string|null|undefined} subject
 * @param {number} [maxLength=50]
 * @returns {string}
 */
export function sanitizeCommitSubject(subject, maxLength = 50) {
  const sanitized = sanitizeMermaidText(subject);
  if (sanitized.length <= maxLength) return sanitized;
  return sanitized.substring(0, maxLength - 3) + '...';
}

/**
 * Sanitiza nombres de rama para Mermaid gitGraph (alfanumérico, guiones y barras seguras).
 *
 * @param {string} branchName
 * @returns {string}
 */
export function sanitizeBranchName(branchName) {
  if (!branchName) return 'branch';
  return branchName
    .replace(/["':#]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Compila la estructura topológica en un diagrama Mermaid gitGraph detallado (commit a commit).
 *
 * @param {Object} topologyData - Datos retornados por extractTopology o analyzeTopologyData
 * @param {Object} [options={}]
 * @returns {string} Código Mermaid gitGraph válido
 */
export function buildDetailedGitGraph(topologyData, options = {}) {
  const baseBranch = topologyData?.baseBranch || 'main';
  const branches = topologyData?.branches || [];
  const dag = topologyData?.dag || new Map();
  const safeBaseBranch = sanitizeBranchName(baseBranch);
  const totalCommits = topologyData?.summary?.totalCommits || dag.size || 0;

  const lines = [];

  // Configuración de rama base inicial
  lines.push(`%%{init: { 'gitGraph': { 'mainBranchName': '${safeBaseBranch}' } } }%%`);
  lines.push('gitGraph');

  if (totalCommits > 150) {
    lines.push(`    %% Warning: Repository contains ${totalCommits} commits (> 150). Recommended to use --simplified.`);
  }

  // Identificar rama base y ramas secundarias
  const baseBranchObj = branches.find(b => b.isBase || b.name === baseBranch);
  const nonBaseBranches = branches.filter(b => !b.isBase && b.name !== baseBranch);

  const baseCommits = (baseBranchObj?.commits || []).slice().reverse(); // De más antiguo a más reciente
  const visitedCommits = new Set();
  const createdBranches = new Set([baseBranch, safeBaseBranch]);
  let currentActiveBranch = safeBaseBranch;

  // Mapa de forkPoints: qué ramas parten de cada commit hash
  const forkMap = new Map();
  for (const b of nonBaseBranches) {
    if (b.forkPoint) {
      if (!forkMap.has(b.forkPoint)) forkMap.set(b.forkPoint, []);
      forkMap.get(b.forkPoint).push(b);
    }
  }

  // Mapa de merges: qué ramas se fusionan en cada merge commit
  const mergeMap = new Map();
  for (const b of nonBaseBranches) {
    if (b.status === 'merged' && b.mergeCommit) {
      if (!mergeMap.has(b.mergeCommit)) mergeMap.set(b.mergeCommit, []);
      mergeMap.get(b.mergeCommit).push(b);
    }
  }

  // Si el repositorio no tiene commits
  if (baseCommits.length === 0 && nonBaseBranches.length === 0) {
    lines.push('    commit id: "init"');
    return lines.join('\n');
  }

  // 1. Procesar commits de la rama base secuencialmente
  for (const c of baseCommits) {
    const shortHash = c.hash ? c.hash.substring(0, 7) : 'commit';
    const author = c.author ? sanitizeMermaidText(c.author.split(' ')[0]) : '';
    const subject = sanitizeCommitSubject(c.subject || '', 40);
    const label = author ? `${shortHash}: ${author} - ${subject}` : `${shortHash}: ${subject}`;

    // Si este commit es un merge de alguna rama
    const mergedHere = mergeMap.get(c.hash);
    if (mergedHere && mergedHere.length > 0) {
      for (const mergedBranch of mergedHere) {
        const safeBranch = sanitizeBranchName(mergedBranch.name);
        if (createdBranches.has(safeBranch)) {
          if (currentActiveBranch !== safeBaseBranch) {
            lines.push(`    checkout ${safeBaseBranch}`);
            currentActiveBranch = safeBaseBranch;
          }
          lines.push(`    merge ${safeBranch} id: "${shortHash}: Merge ${safeBranch}"`);
          visitedCommits.add(c.hash);
        }
      }
    }

    if (!visitedCommits.has(c.hash)) {
      if (currentActiveBranch !== safeBaseBranch) {
        lines.push(`    checkout ${safeBaseBranch}`);
        currentActiveBranch = safeBaseBranch;
      }
      lines.push(`    commit id: "${label}"`);
      visitedCommits.add(c.hash);
    }

    // Si ramas parten de este commit
    const forkingBranches = forkMap.get(c.hash);
    if (forkingBranches && forkingBranches.length > 0) {
      for (const fb of forkingBranches) {
        const safeBranch = sanitizeBranchName(fb.name);
        if (!createdBranches.has(safeBranch)) {
          if (currentActiveBranch !== safeBaseBranch) {
            lines.push(`    checkout ${safeBaseBranch}`);
            currentActiveBranch = safeBaseBranch;
          }
          lines.push(`    branch ${safeBranch}`);
          lines.push(`    checkout ${safeBranch}`);
          createdBranches.add(safeBranch);
          currentActiveBranch = safeBranch;

          // Commits propios de la rama
          const branchCommits = [
            ...(fb.mergedCommits || []),
            ...(fb.unmergedCommits || []),
          ];

          // Ordenar cronológicamente ascendente
          branchCommits.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

          if (branchCommits.length === 0) {
            lines.push(`    commit id: "${safeBranch}-start"`);
          } else {
            for (const bc of branchCommits) {
              if (visitedCommits.has(bc.hash)) continue;
              const bShort = bc.hash ? bc.hash.substring(0, 7) : 'commit';
              const bAuthor = bc.author ? sanitizeMermaidText(bc.author.split(' ')[0]) : '';
              const bSub = sanitizeCommitSubject(bc.subject || '', 40);
              const bLabel = bAuthor ? `${bShort}: ${bAuthor} - ${bSub}` : `${bShort}: ${bSub}`;
              lines.push(`    commit id: "${bLabel}"`);
              visitedCommits.add(bc.hash);
            }
          }
        }
      }
    }
  }

  // 2. Procesar cualquier rama que no haya tenido forkPoint coincidente
  for (const b of nonBaseBranches) {
    const safeBranch = sanitizeBranchName(b.name);
    if (!createdBranches.has(safeBranch)) {
      if (currentActiveBranch !== safeBaseBranch) {
        lines.push(`    checkout ${safeBaseBranch}`);
        currentActiveBranch = safeBaseBranch;
      }
      lines.push(`    branch ${safeBranch}`);
      lines.push(`    checkout ${safeBranch}`);
      createdBranches.add(safeBranch);
      currentActiveBranch = safeBranch;

      const branchCommits = [
        ...(b.mergedCommits || []),
        ...(b.unmergedCommits || []),
      ];
      branchCommits.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      if (branchCommits.length === 0) {
        lines.push(`    commit id: "${safeBranch}-start"`);
      } else {
        for (const bc of branchCommits) {
          if (visitedCommits.has(bc.hash)) continue;
          const bShort = bc.hash ? bc.hash.substring(0, 7) : 'commit';
          const bAuthor = bc.author ? sanitizeMermaidText(bc.author.split(' ')[0]) : '';
          const bSub = sanitizeCommitSubject(bc.subject || '', 40);
          const bLabel = bAuthor ? `${bShort}: ${bAuthor} - ${bSub}` : `${bShort}: ${bSub}`;
          lines.push(`    commit id: "${bLabel}"`);
          visitedCommits.add(bc.hash);
        }
      }

      if (b.status === 'merged') {
        lines.push(`    checkout ${safeBaseBranch}`);
        lines.push(`    merge ${safeBranch}`);
        currentActiveBranch = safeBaseBranch;
      }
    }
  }

  return lines.join('\n');
}

/**
 * Compila la estructura topológica en un diagrama de flujo simplificado DAG (flowchart LR).
 * Representa las ramas como nodos rectangulares con colaboradores principales e insignias.
 *
 * @param {Object} topologyData - Datos de topología
 * @param {Object} [collaboratorsData={}] - Métricas de colaboradores por rama
 * @param {Object} [options={}]
 * @returns {string} Código Mermaid flowchart LR válido
 */
export function buildSimplifiedFlowchart(topologyData, collaboratorsData = {}, options = {}) {
  const branches = topologyData?.branches || [];
  const baseBranch = topologyData?.baseBranch || 'main';
  const i18n = options.i18nInstance || null;
  const translate = (key, params) => (i18n ? i18n.t(key, params) : t(key, params));

  const branchMetrics = collaboratorsData.byBranch || [];
  const branchMetricsMap = new Map();
  for (const bm of branchMetrics) {
    branchMetricsMap.set(bm.branch, bm);
  }

  const lines = [];
  lines.push('flowchart LR');
  lines.push('    %% Declaración de Nodos de Ramas');

  const nodeIdMap = new Map();
  let baseNodeId = 'b_0';

  branches.forEach((b, idx) => {
    const nodeId = `b_${idx}`;
    nodeIdMap.set(b.name, nodeId);
    if (b.isBase || b.name === baseBranch) {
      baseNodeId = nodeId;
    }

    const bm = branchMetricsMap.get(b.name);
    const totalCommits = b.commits ? b.commits.length : (bm?.totalCommits ?? 0);

    // Obtener nombres de hasta 3 colaboradores principales
    let topAuthors = '';
    if (bm && Array.isArray(bm.collaborators) && bm.collaborators.length > 0) {
      const names = bm.collaborators.slice(0, 3).map(c => sanitizeMermaidText(c.name));
      topAuthors = names.join(', ');
    }

    // Insignia de estado localizada
    let statusText = '';
    if (b.isBase) {
      statusText = `[${translate('graph.statusBase')}]`;
    } else if (b.status === 'merged') {
      statusText = `[${translate('graph.statusMerged')}]`;
    } else if (b.status === 'diverged') {
      statusText = `[${translate('graph.statusDiverged')}]`;
    } else {
      statusText = `[${translate('graph.statusActive')}]`;
    }

    const branchLabel = sanitizeMermaidText(b.name);
    const commitsLabel = `${totalCommits} commits`;
    const authorLine = topAuthors ? `<br/>👤 ${topAuthors}` : '';

    lines.push(`    ${nodeId}["<b>${branchLabel}</b> ${statusText}<br/>(${commitsLabel})${authorLine}"]`);
  });

  lines.push('');
  lines.push('    %% Relaciones Topológicas de Bifurcación y Fusión');

  // Aristas de relación
  branches.forEach((b) => {
    if (b.isBase || b.name === baseBranch) return;
    const currId = nodeIdMap.get(b.name);
    if (!currId) return;

    // Conexión de bifurcación desde base
    lines.push(`    ${baseNodeId} -->|fork| ${currId}`);

    // Si está fusionada, flecha de merge de regreso a base
    if (b.status === 'merged') {
      lines.push(`    ${currId} -->|merge| ${baseNodeId}`);
    } else if (b.status === 'diverged') {
      const ahead = b.aheadCount ?? 0;
      const behind = b.behindCount ?? 0;
      lines.push(`    ${currId} -.->|${ahead} ahead / ${behind} behind| ${baseNodeId}`);
    } else {
      const ahead = b.aheadCount ?? 0;
      if (ahead > 0) {
        lines.push(`    ${currId} -.->|${ahead} ahead| ${baseNodeId}`);
      }
    }
  });

  lines.push('');
  lines.push('    %% Estilos de Nodos');
  lines.push('    classDef baseNode fill:#238636,stroke:#2ea043,stroke-width:2px,color:#fff;');
  lines.push('    classDef activeNode fill:#1f6feb,stroke:#388bfd,stroke-width:2px,color:#fff;');
  lines.push('    classDef mergedNode fill:#8957e5,stroke:#a371f7,stroke-width:2px,color:#fff;');
  lines.push('    classDef divergedNode fill:#d29922,stroke:#e3b341,stroke-width:2px,color:#fff;');

  branches.forEach((b) => {
    const id = nodeIdMap.get(b.name);
    if (!id) return;
    if (b.isBase) {
      lines.push(`    class ${id} baseNode;`);
    } else if (b.status === 'merged') {
      lines.push(`    class ${id} mergedNode;`);
    } else if (b.status === 'diverged') {
      lines.push(`    class ${id} divergedNode;`);
    } else {
      lines.push(`    class ${id} activeNode;`);
    }
  });

  return lines.join('\n');
}

/**
 * Construye la tabla Markdown con las métricas de colaboradores por rama.
 *
 * @param {Object} topologyData
 * @param {Object} collaboratorsData
 * @param {Object} [options={}]
 * @returns {Array<Object>} Lista estructurada de datos por rama para la tabla
 */
export function generateCollaboratorsTableData(topologyData, collaboratorsData = {}, options = {}) {
  const branches = topologyData?.branches || [];
  const branchMetrics = collaboratorsData.byBranch || [];
  const i18n = options.i18nInstance || null;
  const translate = (key, params) => (i18n ? i18n.t(key, params) : t(key, params));

  const branchMetricsMap = new Map();
  for (const bm of branchMetrics) {
    branchMetricsMap.set(bm.branch, bm);
  }

  return branches.map((b) => {
    const bm = branchMetricsMap.get(b.name);
    const totalCommits = b.commits ? b.commits.length : (bm?.totalCommits ?? 0);

    // Estado formateado
    let statusBadge = translate('graph.statusActive');
    if (b.isBase) statusBadge = translate('graph.statusBase');
    else if (b.status === 'merged') statusBadge = translate('graph.statusMerged');
    else if (b.status === 'diverged') statusBadge = translate('graph.statusDiverged');

    // Colaboradores con cantidad de commits
    let collaboratorsList = '-';
    if (bm && Array.isArray(bm.collaborators) && bm.collaborators.length > 0) {
      collaboratorsList = bm.collaborators
        .map(c => `${c.name} (${c.commitsCount})`)
        .join(', ');
    }

    // Tipos de cambio (Conventional Commits)
    let typesList = '-';
    if (bm && Array.isArray(bm.collaborators)) {
      const aggregatedTypes = {};
      for (const c of bm.collaborators) {
        for (const [typ, count] of Object.entries(c.types || {})) {
          aggregatedTypes[typ] = (aggregatedTypes[typ] || 0) + count;
        }
      }
      const typeEntries = Object.entries(aggregatedTypes);
      if (typeEntries.length > 0) {
        typesList = typeEntries.map(([k, v]) => `${k}:${v}`).join(', ');
      }
    }

    return {
      branch: b.name,
      isBase: !!b.isBase,
      isCurrent: !!b.isCurrent,
      status: b.status || 'active',
      statusBadge: `[${statusBadge}]`,
      collaboratorsList,
      totalCommits,
      typesList,
    };
  });
}
