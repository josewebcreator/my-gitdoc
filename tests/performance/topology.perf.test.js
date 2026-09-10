import { test } from 'node:test';
import assert from 'node:assert';
import { analyzeTopologyData } from '../../src/graph/topology.js';
import { analyzeCollaborators } from '../../src/graph/collaborators.js';

test('RNF-7 Performance - DAG analysis and collaborators for 50 branches under 3 seconds and < 100 MB Heap', () => {
  // Generar repositorio sintético con 50 ramas y 5,000 commits
  const branches = [];
  const commits = [];

  // Rama principal con 1,000 commits
  let prevMainHash = null;
  const mainCommitHashes = [];

  for (let i = 0; i < 1000; i++) {
    const hash = `main_${i}`;
    mainCommitHashes.push(hash);
    const parents = prevMainHash ? [prevMainHash] : [];
    commits.push({
      hash,
      parents,
      author: i % 2 === 0 ? 'Dev Alfa' : 'Dev Beta',
      email: i % 2 === 0 ? 'alfa@corp.com' : 'beta@corp.com',
      timestamp: 1700000000 + i * 60,
      subject: `feat(core): commit main ${i}`,
    });
    prevMainHash = hash;
  }

  branches.push({
    name: 'main',
    targetCommit: prevMainHash,
    isCurrent: true,
    isRemote: false,
  });

  // 49 ramas secundarias desprendidas en distintos puntos
  for (let b = 1; b <= 49; b++) {
    const forkIndex = (b * 20) % 900;
    const forkCommit = mainCommitHashes[forkIndex];
    let prevBranchHash = forkCommit;
    const branchName = `feature/module_${b}`;

    const branchCommitsCount = 80;
    for (let c = 0; c < branchCommitsCount; c++) {
      const hash = `feat_${b}_commit_${c}`;
      commits.push({
        hash,
        parents: [prevBranchHash],
        author: `Dev_${b % 5}`,
        email: `dev_${b % 5}@corp.com`,
        timestamp: 1700000000 + (forkIndex + c) * 60,
        subject: `feat(mod${b}): feature work ${c}`,
      });
      prevBranchHash = hash;
    }

    branches.push({
      name: branchName,
      targetCommit: prevBranchHash,
      isCurrent: false,
      isRemote: false,
    });
  }

  // Medir memoria y tiempo
  if (global.gc) {
    global.gc();
  }
  const startMem = process.memoryUsage().heapUsed;
  const startTime = performance.now();

  const topology = analyzeTopologyData(branches, commits);
  const collaborators = analyzeCollaborators(topology);

  const durationMs = performance.now() - startTime;
  const endMem = process.memoryUsage().heapUsed;
  const totalHeapMB = endMem / 1024 / 1024;

  assert.strictEqual(topology.branches.length, 50, 'Deben haberse analizado las 50 ramas');
  assert.ok(
    collaborators.byBranch.length === 50,
    'Deben haberse extraído métricas de colaboradores para 50 ramas'
  );

  // Verificación estricta de RNF-7
  assert.ok(
    durationMs < 3000,
    `El análisis tardó ${durationMs.toFixed(2)} ms, superando el límite de 3000 ms (RNF-7)`
  );
  assert.ok(
    totalHeapMB < 100,
    `El consumo de Heap fue ${totalHeapMB.toFixed(2)} MB, superando el límite de 100 MB`
  );
});
