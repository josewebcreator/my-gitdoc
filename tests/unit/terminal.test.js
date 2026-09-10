import { test } from 'node:test';
import assert from 'node:assert';
import { formatTerminalTree } from '../../src/graph/terminal.js';

test('formatTerminalTree - builds unicode tree with branch status and authors', () => {
  const topologyData = {
    baseBranch: 'main',
    branches: [
      {
        name: 'main',
        isBase: true,
        commits: [{ hash: 'm1', subject: 'init main' }],
      },
      {
        name: 'feat/auth',
        isBase: false,
        status: 'active',
        aheadCount: 2,
        commits: [
          { hash: 'a1111111', subject: 'feat: add login' },
          { hash: 'a2222222', subject: 'feat: add signup' },
        ],
        unmergedCommits: [
          { hash: 'a1111111', subject: 'feat: add login' },
          { hash: 'a2222222', subject: 'feat: add signup' },
        ],
      },
      {
        name: 'fix/typo',
        isBase: false,
        status: 'merged',
        commits: [{ hash: 't1111111', subject: 'fix: typo in readme' }],
      },
    ],
  };

  const metrics = {
    byBranch: [
      {
        branch: 'main',
        totalCommits: 1,
        collaborators: [{ name: 'Carlos', commitsCount: 1 }],
      },
      {
        branch: 'feat/auth',
        totalCommits: 2,
        collaborators: [{ name: 'Ana Gómez', commitsCount: 2 }],
      },
      {
        branch: 'fix/typo',
        totalCommits: 1,
        collaborators: [{ name: 'Maria', commitsCount: 1 }],
      },
    ],
  };

  const output = formatTerminalTree(topologyData, metrics);

  assert.ok(output.includes('main'), 'debe incluir la rama base main');
  assert.ok(output.includes('feat/auth'), 'debe incluir la rama feat/auth');
  assert.ok(output.includes('fix/typo'), 'debe incluir la rama fix/typo');
  assert.ok(output.includes('├─') || output.includes('└─'), 'debe incluir conectores unicode de árbol');
  assert.ok(output.includes('Ana Gómez'), 'debe incluir el colaborador Ana Gómez');
  assert.ok(output.includes('a111111'), 'debe incluir el hash corto del commit en preview');
  assert.ok(output.includes('feat: add login'), 'debe incluir el mensaje de commit');
});
