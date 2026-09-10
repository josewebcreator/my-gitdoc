import { test } from 'node:test';
import assert from 'node:assert';
import {
  sanitizeMermaidText,
  sanitizeCommitSubject,
  sanitizeBranchName,
  buildDetailedGitGraph,
  buildSimplifiedFlowchart,
  generateCollaboratorsTableData,
} from '../../src/graph/mermaid.js';

test('sanitizeMermaidText - escapes quotes, brackets, and control characters', () => {
  const input = 'fix(core): "solucionar" [grave] <problema> \\ #45\n\tsegunda linea';
  const sanitized = sanitizeMermaidText(input);

  assert.ok(!sanitized.includes('"'), 'no debe contener comillas dobles');
  assert.ok(!sanitized.includes('['), 'no debe contener corchete apertura');
  assert.ok(!sanitized.includes(']'), 'no debe contener corchete cierre');
  assert.ok(!sanitized.includes('\n'), 'no debe contener saltos de línea');
  assert.ok(!sanitized.includes('\t'), 'no debe contener tabulaciones');
  assert.ok(!sanitized.includes('\\'), 'no debe contener backslash');
  assert.ok(sanitized.includes("'solucionar'"), 'las comillas dobles se convierten en simples');
  assert.ok(sanitized.includes('&lt;problema&gt;'), 'los signos menor/mayor se convierten en entidades');
});

test('sanitizeMermaidText - handles null, undefined and non-string safely', () => {
  assert.strictEqual(sanitizeMermaidText(null), '');
  assert.strictEqual(sanitizeMermaidText(undefined), '');
  assert.strictEqual(sanitizeMermaidText(123), '');
});

test('sanitizeCommitSubject - truncates subjects longer than maxLength', () => {
  const longMsg = 'a'.repeat(80);
  const truncated = sanitizeCommitSubject(longMsg, 40);

  assert.strictEqual(truncated.length, 40);
  assert.ok(truncated.endsWith('...'));
});

test('sanitizeBranchName - replaces spaces, colons, and quotes with hyphens', () => {
  assert.strictEqual(sanitizeBranchName('feat/my "branch":#1'), 'feat/my-branch-1');
  assert.strictEqual(sanitizeBranchName(''), 'branch');
});

test('buildDetailedGitGraph - single branch linear history', () => {
  const topologyData = {
    baseBranch: 'main',
    branches: [
      {
        name: 'main',
        isBase: true,
        commits: [
          { hash: 'c2222222', author: 'Ana', subject: 'feat: second commit', timestamp: 100 },
          { hash: 'c1111111', author: 'Ana', subject: 'feat: first commit', timestamp: 50 },
        ],
      },
    ],
    summary: { totalCommits: 2 },
  };

  const code = buildDetailedGitGraph(topologyData);

  assert.ok(code.includes("mainBranchName': 'main'"), 'debe configurar main como rama base');
  assert.ok(code.includes('gitGraph'), 'debe inicializar gitGraph');
  assert.ok(code.includes('c111111'), 'debe contener el commit más antiguo primero');
  assert.ok(code.includes('c222222'), 'debe contener el commit más reciente');
});

test('buildDetailedGitGraph - multi-branch with branch, checkout, and merge', () => {
  const topologyData = {
    baseBranch: 'main',
    branches: [
      {
        name: 'main',
        isBase: true,
        commits: [
          { hash: 'm2222222', author: 'Carlos', subject: 'Merge branch feat/login', timestamp: 300 },
          { hash: 'm1111111', author: 'Carlos', subject: 'Initial commit', timestamp: 100 },
        ],
      },
      {
        name: 'feat/login',
        isBase: false,
        status: 'merged',
        forkPoint: 'm1111111',
        mergeCommit: 'm2222222',
        commits: [
          { hash: 'f1111111', author: 'Ana', subject: 'feat: auth form', timestamp: 200 },
        ],
        mergedCommits: [
          { hash: 'f1111111', author: 'Ana', subject: 'feat: auth form', timestamp: 200 },
        ],
        unmergedCommits: [],
      },
    ],
    summary: { totalCommits: 3 },
  };

  const code = buildDetailedGitGraph(topologyData);

  assert.ok(code.includes('branch feat/login'), 'debe crear la rama feat/login');
  assert.ok(code.includes('checkout feat/login'), 'debe cambiar a la rama feat/login');
  assert.ok(code.includes('f111111'), 'debe contener el commit de la rama');
  assert.ok(code.includes('merge feat/login'), 'debe registrar el merge de la rama');
});

test('buildDetailedGitGraph - sanitizes commit messages with quotes and special characters', () => {
  const topologyData = {
    baseBranch: 'main',
    branches: [
      {
        name: 'main',
        isBase: true,
        commits: [
          { hash: 'c1111111', author: 'Dev User', subject: 'fix(core): "solucionar" problema #45', timestamp: 100 },
        ],
      },
    ],
    summary: { totalCommits: 1 },
  };

  const code = buildDetailedGitGraph(topologyData);

  assert.ok(!code.includes('"solucionar"'), 'no debe contener comillas dobles anidadas');
  assert.ok(code.includes("'solucionar'"), 'las comillas deben ser reemplazadas por simples');
});

test('buildDetailedGitGraph - emits warning when commit count exceeds 150', () => {
  const topologyData = {
    baseBranch: 'main',
    branches: [
      {
        name: 'main',
        isBase: true,
        commits: [{ hash: 'c1111111', author: 'Ana', subject: 'init', timestamp: 10 }],
      },
    ],
    summary: { totalCommits: 200 },
  };

  const code = buildDetailedGitGraph(topologyData);
  assert.ok(code.includes('Warning: Repository contains 200 commits'), 'debe emitir advertencia de límite de commits');
});

test('buildSimplifiedFlowchart - generates flowchart LR with branches, collaborators and relationships', () => {
  const topologyData = {
    baseBranch: 'main',
    branches: [
      {
        name: 'main',
        isBase: true,
        commits: [{ hash: 'm1' }, { hash: 'm2' }],
      },
      {
        name: 'feat/auth',
        isBase: false,
        status: 'active',
        aheadCount: 3,
        commits: [{ hash: 'a1' }, { hash: 'a2' }, { hash: 'a3' }],
      },
      {
        name: 'fix/nav',
        isBase: false,
        status: 'merged',
        commits: [{ hash: 'n1' }],
      },
    ],
  };

  const collaboratorsData = {
    byBranch: [
      {
        branch: 'main',
        collaborators: [{ name: 'Carlos', commitsCount: 2 }],
      },
      {
        branch: 'feat/auth',
        collaborators: [{ name: 'Ana', commitsCount: 2 }, { name: 'Juan', commitsCount: 1 }],
      },
      {
        branch: 'fix/nav',
        collaborators: [{ name: 'Maria', commitsCount: 1 }],
      },
    ],
  };

  const code = buildSimplifiedFlowchart(topologyData, collaboratorsData);

  assert.ok(code.includes('flowchart LR'), 'debe inicializar con flowchart LR');
  assert.ok(code.includes('b_0'), 'debe tener nodo para main');
  assert.ok(code.includes('b_1'), 'debe tener nodo para feat/auth');
  assert.ok(code.includes('b_2'), 'debe tener nodo para fix/nav');
  assert.ok(code.includes('Ana, Juan'), 'debe incluir colaboradores de feat/auth');
  assert.ok(code.includes('-->|fork|'), 'debe contener arista de fork');
  assert.ok(code.includes('-->|merge|'), 'debe contener arista de merge');
  assert.ok(code.includes('classDef baseNode'), 'debe definir estilos visuales');
});

test('generateCollaboratorsTableData - produces structured rows matching Delta Specs', () => {
  const topologyData = {
    baseBranch: 'main',
    branches: [
      {
        name: 'main',
        isBase: true,
        isCurrent: true,
        status: 'active',
        commits: [{ hash: 'c1' }, { hash: 'c2' }],
      },
      {
        name: 'feat/api',
        isBase: false,
        isCurrent: false,
        status: 'active',
        commits: [{ hash: 'a1' }],
      },
    ],
  };

  const collaboratorsData = {
    byBranch: [
      {
        branch: 'main',
        totalCommits: 2,
        collaborators: [
          { name: 'Ana Gómez', commitsCount: 2, types: { feat: 1, fix: 1 } },
        ],
      },
      {
        branch: 'feat/api',
        totalCommits: 1,
        collaborators: [
          { name: 'Carlos Ruiz', commitsCount: 1, types: { feat: 1 } },
        ],
      },
    ],
  };

  const rows = generateCollaboratorsTableData(topologyData, collaboratorsData);

  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0].branch, 'main');
  assert.strictEqual(rows[0].isCurrent, true);
  assert.ok(rows[0].collaboratorsList.includes('Ana Gómez (2)'));
  assert.ok(rows[0].typesList.includes('feat:1') && rows[0].typesList.includes('fix:1'));

  assert.strictEqual(rows[1].branch, 'feat/api');
  assert.ok(rows[1].collaboratorsList.includes('Carlos Ruiz (1)'));
});
