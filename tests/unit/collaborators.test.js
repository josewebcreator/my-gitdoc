import { test } from 'node:test';
import assert from 'node:assert';
import { analyzeCollaborators } from '../../src/graph/collaborators.js';

test('analyzeCollaborators - Scenario: Múltiples trabajadores en una misma rama', () => {
  // WHEN dos colaboradores ("Ana" y "Carlos") realizan 3 y 2 commits respectivamente en la rama feature/ui
  const topologyMock = {
    branches: [
      {
        name: 'feature/ui',
        status: 'active',
        isBase: false,
        commits: [
          {
            hash: 'u5',
            author: 'Carlos',
            email: 'carlos@test.com',
            timestamp: 1767312000,
            date: new Date('2026-01-02T12:00:00Z'),
            subject: 'fix(ui): adjust button padding',
          },
          {
            hash: 'u4',
            author: 'Ana',
            email: 'ana@test.com',
            timestamp: 1767225600,
            date: new Date('2026-01-01T12:00:00Z'),
            subject: 'feat(ui): add modal animation',
          },
          {
            hash: 'u3',
            author: 'Carlos',
            email: 'carlos@test.com',
            timestamp: 1767139200,
            date: new Date('2025-12-31T12:00:00Z'),
            subject: 'style(ui): update color theme',
          },
          {
            hash: 'u2',
            author: 'Ana',
            email: 'ana@test.com',
            timestamp: 1767052800,
            date: new Date('2025-12-30T12:00:00Z'),
            subject: 'feat(ui): implement dark mode switcher',
          },
          {
            hash: 'u1',
            author: 'Ana',
            email: 'ana@test.com',
            timestamp: 1766966400,
            date: new Date('2025-12-29T12:00:00Z'),
            subject: 'feat(ui): initial ui scaffolding',
          },
        ],
      },
    ],
  };

  const metrics = analyzeCollaborators(topologyMock);

  assert.strictEqual(metrics.byBranch.length, 1);
  const uiBranch = metrics.byBranch[0];
  assert.strictEqual(uiBranch.branch, 'feature/ui');
  assert.strictEqual(uiBranch.totalCommits, 5);
  assert.strictEqual(uiBranch.authorsCount, 2);

  // THEN el reporte de colaboradores de feature/ui lista a ambos autores, sus cantidades respectivas de commits y el rango de fechas de su participación
  const ana = uiBranch.collaborators.find((c) => c.name === 'Ana');
  assert.ok(ana);
  assert.strictEqual(ana.commitsCount, 3);
  assert.strictEqual(ana.email, 'ana@test.com');
  assert.deepStrictEqual(ana.firstCommitDate, new Date('2025-12-29T12:00:00Z'));
  assert.deepStrictEqual(ana.lastCommitDate, new Date('2026-01-01T12:00:00Z'));
  assert.strictEqual(ana.primaryType, 'feat');
  assert.strictEqual(ana.primaryScope, 'ui');
  assert.deepStrictEqual(ana.scopes, ['ui']);

  const carlos = uiBranch.collaborators.find((c) => c.name === 'Carlos');
  assert.ok(carlos);
  assert.strictEqual(carlos.commitsCount, 2);
  assert.strictEqual(carlos.email, 'carlos@test.com');
  assert.deepStrictEqual(carlos.firstCommitDate, new Date('2025-12-31T12:00:00Z'));
  assert.deepStrictEqual(carlos.lastCommitDate, new Date('2026-01-02T12:00:00Z'));
  assert.deepStrictEqual(carlos.scopes, ['ui']);
  assert.ok(carlos.types.fix === 1 && carlos.types.style === 1);
});

test('analyzeCollaborators - aggregates global contributors across multiple branches', () => {
  const topologyMock = {
    branches: [
      {
        name: 'main',
        commits: [
          { hash: 'm1', author: 'Ana', email: 'ana@test.com', timestamp: 100, subject: 'chore: init' },
        ],
      },
      {
        name: 'feature/auth',
        commits: [
          { hash: 'a1', author: 'Ana', email: 'ana@test.com', timestamp: 200, subject: 'feat(auth): token' },
          { hash: 'a2', author: 'Bob', email: 'bob@test.com', timestamp: 300, subject: 'fix(auth): bug' },
        ],
      },
    ],
  };

  const metrics = analyzeCollaborators(topologyMock);

  assert.strictEqual(metrics.summary.totalUniqueAuthors, 2);
  const anaGlobal = metrics.global.find((g) => g.name === 'Ana');
  assert.ok(anaGlobal);
  assert.strictEqual(anaGlobal.commitsCount, 2);
  assert.deepStrictEqual(anaGlobal.branches.sort(), ['feature/auth', 'main']);

  const bobGlobal = metrics.global.find((g) => g.name === 'Bob');
  assert.ok(bobGlobal);
  assert.strictEqual(bobGlobal.commitsCount, 1);
  assert.deepStrictEqual(bobGlobal.branches, ['feature/auth']);
});
