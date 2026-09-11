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

  // Commits de la rama base de más antiguo a más reciente
  const baseCommits = (baseBranchObj?.commits || []).slice().reverse();
  const visitedCommits = new Set();
  const createdBranches = new Set([baseBranch, safeBaseBranch]);
  const branchEmittedCommits = new Map();
  branchEmittedCommits.set(safeBaseBranch, 0);
  let currentActiveBranch = safeBaseBranch;

  // Mapa de forkPoints: qué ramas arrancan en cada commit de la base
  const forkMap = new Map();
  for (const b of nonBaseBranches) {
    if (b.forkPoint) {
      if (!forkMap.has(b.forkPoint)) forkMap.set(b.forkPoint, []);
      forkMap.get(b.forkPoint).push(b);
    }
  }

  // Si la rama base no tiene commits registrados
  if (baseCommits.length === 0) {
    if (nonBaseBranches.length === 0) {
      lines.push('    commit id: "init"');
      return lines.join('\n');
    }
    const tipHash = baseBranchObj?.targetCommit ? baseBranchObj.targetCommit.substring(0, 7) : safeBaseBranch;
    lines.push(`    commit id: "${tipHash}: ${safeBaseBranch}-root"`);
    branchEmittedCommits.set(safeBaseBranch, 1);
  }

  // Helper: emitir un commit en la rama activa
  function emitCommit(c, branchKey) {
    const shortHash = c.hash ? c.hash.substring(0, 7) : 'commit';
    const author = c.author ? sanitizeMermaidText(c.author.split(' ')[0]) : '';
    const subject = sanitizeCommitSubject(c.subject || '', 35);
    const label = author ? `${shortHash}: ${author} - ${subject}` : `${shortHash}: ${subject}`;
    lines.push(`    commit id: "${label}"`);
    visitedCommits.add(c.hash);
    branchEmittedCommits.set(branchKey, (branchEmittedCommits.get(branchKey) || 0) + 1);
  }

  // Helper: asegurar que estamos en la rama indicada
  function checkoutIfNeeded(targetBranch) {
    if (currentActiveBranch !== targetBranch) {
      lines.push(`    checkout ${targetBranch}`);
      currentActiveBranch = targetBranch;
    }
  }

  // Helper: procesar una rama secundaria en el punto de bifurcación
  function processBranch(b) {
    const safeBranch = sanitizeBranchName(b.name);
    if (createdBranches.has(safeBranch)) return;

    // Commits propios de esta rama en orden cronológico ascendente
    const branchCommits = [
      ...(b.mergedCommits || []),
      ...(b.unmergedCommits || []),
    ].sort((a, bx) => (a.timestamp || 0) - (bx.timestamp || 0));
    const uniqueCommits = branchCommits.filter(c => !visitedCommits.has(c.hash));

    const parentName = b.parentBranch || baseBranch;
    const parentSafeBranch = sanitizeBranchName(parentName);
    const targetName = b.mergedInto || parentName;
    const targetSafeBranch = sanitizeBranchName(targetName);

    // Asegurar que la rama padre esté creada, activa y con al menos un commit antes de bifurcar
    const parentTarget = createdBranches.has(parentSafeBranch) ? parentSafeBranch : safeBaseBranch;
    checkoutIfNeeded(parentTarget);
    if ((branchEmittedCommits.get(parentTarget) || 0) === 0) {
      lines.push(`    commit id: "${parentTarget}-base"`);
      branchEmittedCommits.set(parentTarget, 1);
    }

    lines.push(`    branch ${safeBranch}`);
    lines.push(`    checkout ${safeBranch}`);
    createdBranches.add(safeBranch);
    currentActiveBranch = safeBranch;
    branchEmittedCommits.set(safeBranch, 0);

    if (uniqueCommits.length === 0) {
      // Marcador de rama para auditoría (indica que existió, aunque sus commits ya estén en la base)
      const tipHash = b.targetCommit ? b.targetCommit.substring(0, 7) : safeBranch;
      lines.push(`    commit id: "${tipHash}: ${safeBranch}-tip"`);
      branchEmittedCommits.set(safeBranch, 1);
    } else {
      for (const c of uniqueCommits) {
        emitCommit(c, safeBranch);
      }
    }

    // Registrar merge hacia la rama destino real
    if (b.status === 'merged') {
      const mergeHash = b.mergeCommit
        ? b.mergeCommit.substring(0, 7)
        : (b.targetCommit ? b.targetCommit.substring(0, 7) : 'merge');
      const checkoutTarget = createdBranches.has(targetSafeBranch) ? targetSafeBranch : safeBaseBranch;
      checkoutIfNeeded(checkoutTarget);

      // Salvaguarda Mermaid: la rama receptora del merge debe tener al menos un commit previo
      if ((branchEmittedCommits.get(checkoutTarget) || 0) === 0) {
        lines.push(`    commit id: "${checkoutTarget}-base"`);
        branchEmittedCommits.set(checkoutTarget, 1);
      }

      lines.push(`    merge ${safeBranch} id: "${mergeHash}: Merge ${safeBranch}" tag: "merged"`);
      branchEmittedCommits.set(checkoutTarget, (branchEmittedCommits.get(checkoutTarget) || 0) + 1);
    }
  }

  // 1. Procesar commits de la rama base, bifurcando cuando corresponde
  for (const c of baseCommits) {
    if (!visitedCommits.has(c.hash)) {
      checkoutIfNeeded(safeBaseBranch);
      emitCommit(c, safeBaseBranch);
    }

    // Bifurcar ramas que parten de este commit
    const forkingBranches = forkMap.get(c.hash);
    if (forkingBranches && forkingBranches.length > 0) {
      for (const fb of forkingBranches) {
        processBranch(fb);
      }
    }
  }

  // 2. Ramas sin forkPoint identificado (ej: rama raíz o fast-forward total)
  for (const b of nonBaseBranches) {
    const safeBranch = sanitizeBranchName(b.name);
    if (!createdBranches.has(safeBranch)) {
      processBranch(b);
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
  lines.push('    %% Relaciones Topológicas Reales de Bifurcación y Fusión (DAG)');

  // Aristas de relación genealógica real
  branches.forEach((b) => {
    const currId = nodeIdMap.get(b.name);
    if (!currId) return;

    const parentName = b.parentBranch || (b.isBase ? null : baseBranch);
    const parentId = parentName ? nodeIdMap.get(parentName) : null;
    const targetName = b.mergedInto || (b.status === 'merged' ? (b.parentBranch || baseBranch) : null);
    const targetId = targetName ? nodeIdMap.get(targetName) : null;

    // 1. Conexión de bifurcación desde su parentBranch real
    if (parentId && parentId !== currId) {
      lines.push(`    ${parentId} -->|fork| ${currId}`);
    }

    // 2. Conexión de fusión o divergencia
    if (b.status === 'merged') {
      const mergeToId = targetId || parentId;
      if (mergeToId && mergeToId !== currId) {
        lines.push(`    ${currId} -->|merge| ${mergeToId}`);
      }
    } else if (b.status === 'diverged') {
      const ahead = b.aheadCount ?? 0;
      const behind = b.behindCount ?? 0;
      const relId = parentId || baseNodeId;
      if (relId && relId !== currId) {
        lines.push(`    ${currId} -.->|${ahead} ahead / ${behind} behind| ${relId}`);
      }
    } else if (b.status === 'active' && !b.isBase) {
      const ahead = b.aheadCount ?? 0;
      const relId = parentId || baseNodeId;
      if (relId && relId !== currId && ahead > 0) {
        lines.push(`    ${currId} -.->|${ahead} ahead| ${relId}`);
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
  const baseBranch = topologyData?.baseBranch || 'main';
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
      parentBranch: b.parentBranch || (b.isBase ? '-' : (baseBranch || '-')),
      mergedInto: b.mergedInto || (b.status === 'merged' ? (b.parentBranch || baseBranch || '-') : '-'),
      collaboratorsList,
      totalCommits,
      typesList,
    };
  });
}
