import { test } from 'node:test';
import assert from 'node:assert';
import {
  buildDag,
  isAncestor,
  findLcaInDag,
  detectBaseBranch,
  analyzeTopologyData,
} from '../../src/graph/topology.js';

test('buildDag - indices nodes and establishes bidirectional parent-child connections', () => {
  const rawCommits = [
    { hash: 'c3', parents: ['c2'], author: 'Ana', email: 'ana@test.com', timestamp: 1700000002, subject: 'feat: three' },
    { hash: 'c2', parents: ['c1'], author: 'Carlos', email: 'carlos@test.com', timestamp: 1700000001, subject: 'fix: two' },
    { hash: 'c1', parents: [], author: 'Ana', email: 'ana@test.com', timestamp: 1700000000, subject: 'feat: one' },
  ];

  const dag = buildDag(rawCommits);

  assert.strictEqual(dag.size, 3);
  assert.deepStrictEqual(dag.get('c1').children, ['c2']);
  assert.deepStrictEqual(dag.get('c2').children, ['c3']);
  assert.deepStrictEqual(dag.get('c3').parents, ['c2']);
  assert.strictEqual(dag.get('c2').author, 'Carlos');
});

test('isAncestor - verifies reachability correctly', () => {
  const rawCommits = [
    { hash: 'c3', parents: ['c2'], timestamp: 3 },
    { hash: 'c2', parents: ['c1'], timestamp: 2 },
    { hash: 'c1', parents: [], timestamp: 1 },
    { hash: 'other', parents: [], timestamp: 1 },
  ];
  const dag = buildDag(rawCommits);

  assert.strictEqual(isAncestor('c1', 'c3', dag), true);
  assert.strictEqual(isAncestor('c2', 'c3', dag), true);
  assert.strictEqual(isAncestor('c3', 'c1', dag), false);
  assert.strictEqual(isAncestor('other', 'c3', dag), false);
});

test('findLcaInDag - finds lowest common ancestor in bifurcated DAG', () => {
  // c1 -> c2 -> c3 (main)
  //          -> b1 -> b2 (feature)
  const rawCommits = [
    { hash: 'c1', parents: [], timestamp: 100 },
    { hash: 'c2', parents: ['c1'], timestamp: 200 },
    { hash: 'c3', parents: ['c2'], timestamp: 300 },
    { hash: 'b1', parents: ['c2'], timestamp: 250 },
    { hash: 'b2', parents: ['b1'], timestamp: 350 },
  ];
  const dag = buildDag(rawCommits);

  const lca = findLcaInDag('c3', 'b2', dag);
  assert.strictEqual(lca, 'c2');
});

test('detectBaseBranch - chooses preferred branches in order or falls back', () => {
  assert.strictEqual(detectBaseBranch([{ name: 'feature/x' }, { name: 'main' }]), 'main');
  assert.strictEqual(detectBaseBranch([{ name: 'feature/x' }, { name: 'master' }]), 'master');
  assert.strictEqual(detectBaseBranch([{ name: 'develop' }, { name: 'feature/x' }]), 'develop');
  assert.strictEqual(detectBaseBranch([{ name: 'feature/x', isCurrent: true }]), 'feature/x');
  assert.strictEqual(detectBaseBranch([], {}), 'main');
});

test('analyzeTopologyData - Scenario: Repositorio con una única rama (main)', () => {
  const branches = [{ name: 'main', targetCommit: 'm2', isCurrent: true, isRemote: false }];
  const commits = [
    { hash: 'm2', parents: ['m1'], author: 'Ana', email: 'ana@corp.com', timestamp: 200, subject: 'feat(core): update' },
    { hash: 'm1', parents: [], author: 'Ana', email: 'ana@corp.com', timestamp: 100, subject: 'chore(init): initial' },
  ];

  const result = analyzeTopologyData(branches, commits);

  assert.strictEqual(result.baseBranch, 'main');
  assert.strictEqual(result.branches.length, 1);
  const main = result.branches[0];
  assert.strictEqual(main.isBase, true);
  assert.strictEqual(main.status, 'active');
  assert.strictEqual(main.forkPoint, null);
  assert.strictEqual(main.commits.length, 2);
  assert.strictEqual(result.summary.totalBranches, 1);
  assert.strictEqual(result.summary.totalCommits, 2);
});

test('analyzeTopologyData - Scenario: Rama de funcionalidad desprendida de main', () => {
  // m1 -> a1b2c3d (main base)
  //            -> f1 -> f2 -> f3 -> f4 (feature/cart tip)
  const branches = [
    { name: 'main', targetCommit: 'a1b2c3d', isCurrent: true, isRemote: false },
    { name: 'feature/cart', targetCommit: 'f4', isCurrent: false, isRemote: false },
  ];
  const commits = [
    { hash: 'f4', parents: ['f3'], author: 'Carlos', email: 'carlos@test.com', timestamp: 600, subject: 'feat(cart): checkout' },
    { hash: 'f3', parents: ['f2'], author: 'Carlos', email: 'carlos@test.com', timestamp: 500, subject: 'feat(cart): coupon' },
    { hash: 'f2', parents: ['f1'], author: 'Carlos', email: 'carlos@test.com', timestamp: 400, subject: 'feat(cart): remove' },
    { hash: 'f1', parents: ['a1b2c3d'], author: 'Carlos', email: 'carlos@test.com', timestamp: 300, subject: 'feat(cart): add' },
    { hash: 'a1b2c3d', parents: ['m1'], author: 'Ana', email: 'ana@test.com', timestamp: 200, subject: 'feat(core): engine' },
    { hash: 'm1', parents: [], author: 'Ana', email: 'ana@test.com', timestamp: 100, subject: 'chore: init' },
  ];

  const result = analyzeTopologyData(branches, commits);

  assert.strictEqual(result.baseBranch, 'main');
  const cartBranch = result.branches.find((b) => b.name === 'feature/cart');
  assert.ok(cartBranch);
  assert.strictEqual(cartBranch.baseBranch, 'main');
  assert.strictEqual(cartBranch.forkPoint, 'a1b2c3d');
  assert.strictEqual(cartBranch.status, 'active');
  assert.strictEqual(cartBranch.commits.length, 4);
  assert.deepStrictEqual(cartBranch.commits.map((c) => c.hash), ['f4', 'f3', 'f2', 'f1']);
});

test('analyzeTopologyData - Scenario: Detección de rama fusionada (merged)', () => {
  // m1 -> a1b2c3d -> m_next -> f9e8d7c (merge commit in main, parents: [m_next, f4])
  //            -> f1 -> f4 (feature/cart)
  const branches = [
    { name: 'main', targetCommit: 'f9e8d7c', isCurrent: true, isRemote: false },
    { name: 'feature/cart', targetCommit: 'f4', isCurrent: false, isRemote: false },
  ];
  const commits = [
    { hash: 'f9e8d7c', parents: ['m_next', 'f4'], author: 'Ana', email: 'ana@test.com', timestamp: 700, subject: 'Merge branch feature/cart', isMerge: true },
    { hash: 'm_next', parents: ['a1b2c3d'], author: 'Ana', email: 'ana@test.com', timestamp: 500, subject: 'fix(core): hotfix' },
    { hash: 'f4', parents: ['f1'], author: 'Carlos', email: 'carlos@test.com', timestamp: 400, subject: 'feat(cart): finish cart' },
    { hash: 'f1', parents: ['a1b2c3d'], author: 'Carlos', email: 'carlos@test.com', timestamp: 300, subject: 'feat(cart): start cart' },
    { hash: 'a1b2c3d', parents: ['m1'], author: 'Ana', email: 'ana@test.com', timestamp: 200, subject: 'feat: setup' },
    { hash: 'm1', parents: [], author: 'Ana', email: 'ana@test.com', timestamp: 100, subject: 'chore: root' },
  ];

  const result = analyzeTopologyData(branches, commits);

  const cartBranch = result.branches.find((b) => b.name === 'feature/cart');
  assert.ok(cartBranch);
  assert.strictEqual(cartBranch.status, 'merged');
  assert.strictEqual(cartBranch.mergeCommit, 'f9e8d7c');
  assert.strictEqual(cartBranch.forkPoint, 'a1b2c3d');
  assert.strictEqual(cartBranch.commits.length, 2);
  assert.deepStrictEqual(cartBranch.commits.map((c) => c.hash), ['f4', 'f1']);
});

test('analyzeTopologyData - detects diverged branch when both base and branch progressed', () => {
  // m1 -> root -> m2 (main tip)
  //            -> d1 -> d2 (feature tip)
  const branches = [
    { name: 'main', targetCommit: 'm2', isCurrent: true },
    { name: 'feature/diverged', targetCommit: 'd2' },
  ];
  const commits = [
    { hash: 'm2', parents: ['root'], timestamp: 300, author: 'Ana' },
    { hash: 'd2', parents: ['d1'], timestamp: 400, author: 'Bob' },
    { hash: 'd1', parents: ['root'], timestamp: 250, author: 'Bob' },
    { hash: 'root', parents: ['m1'], timestamp: 200, author: 'Ana' },
    { hash: 'm1', parents: [], timestamp: 100, author: 'Ana' },
  ];

  const result = analyzeTopologyData(branches, commits);
  const divBranch = result.branches.find((b) => b.name === 'feature/diverged');
  assert.ok(divBranch);
  assert.strictEqual(divBranch.status, 'diverged');
  assert.strictEqual(divBranch.forkPoint, 'root');
  assert.strictEqual(divBranch.commits.length, 2);
});

test('analyzeTopologyData - Scenario: Filtrado por desarrollador específico (--author)', () => {
  const branches = [
    { name: 'main', targetCommit: 'm1' },
    { name: 'feature/carlos', targetCommit: 'c1' },
    { name: 'feature/elena', targetCommit: 'e1' },
  ];
  const commits = [
    { hash: 'm1', parents: ['root'], author: 'Carlos', email: 'carlos@test.com', timestamp: 200 },
    { hash: 'c1', parents: ['root'], author: 'Carlos', email: 'carlos@test.com', timestamp: 300 },
    { hash: 'e1', parents: ['root'], author: 'Elena', email: 'elena@test.com', timestamp: 300 },
    { hash: 'root', parents: [], author: 'Admin', email: 'admin@test.com', timestamp: 100 },
  ];

  const result = analyzeTopologyData(branches, commits, { author: 'Carlos' });
  const names = result.branches.map((b) => b.name);

  assert.ok(names.includes('feature/carlos'));
  assert.ok(!names.includes('feature/elena'));
});

test('analyzeTopologyData - Scenario: Acotación temporal por fecha (--since y --until)', () => {
  const branches = [
    { name: 'main', targetCommit: 'c3' },
  ];
  const commits = [
    { hash: 'c3', parents: ['c2'], author: 'Ana', timestamp: 1767225600, date: new Date('2026-01-02T00:00:00Z'), subject: 'c3' },
    { hash: 'c2', parents: ['c1'], author: 'Ana', timestamp: 1767139200, date: new Date('2026-01-01T00:00:00Z'), subject: 'c2' },
    { hash: 'c1', parents: [], author: 'Ana', timestamp: 1764547200, date: new Date('2025-12-01T00:00:00Z'), subject: 'c1' },
  ];

  const resultSince = analyzeTopologyData(branches, commits, { since: '2026-01-01T00:00:00Z' });
  assert.strictEqual(resultSince.branches[0].commits.length, 2);

  const resultUntil = analyzeTopologyData(branches, commits, { until: '2025-12-31T23:59:59Z' });
  assert.strictEqual(resultUntil.branches[0].commits.length, 1);
  assert.strictEqual(resultUntil.branches[0].commits[0].hash, 'c1');

  // Verifica que un formato YYYY-MM-DD sin hora sea inclusivo de todo el día
  const resultUntilDay = analyzeTopologyData(branches, commits, { until: '2026-01-01' });
  assert.strictEqual(resultUntilDay.branches[0].commits.length, 2);
});

test('analyzeTopologyData - distinguishes merged and unmerged commits and resolves fast-forward fork points', () => {
  // m1 -> a1 -> b1 (feature/prev) -> c1 -> c2 (feature/merged) -> dev (base tip)
  //          \-> d1 (feature/diverged)
  const branches = [
    { name: 'dev', targetCommit: 'devTip', isCurrent: true },
    { name: 'feature/prev', targetCommit: 'b1' },
    { name: 'feature/merged', targetCommit: 'c2' },
    { name: 'feature/diverged', targetCommit: 'd1' },
  ];
  const commits = [
    { hash: 'devTip', parents: ['c2'], author: 'Ana', timestamp: 600, subject: 'dev commit' },
    { hash: 'c2', parents: ['c1'], author: 'Carlos', timestamp: 500, subject: 'feat: c2' },
    { hash: 'c1', parents: ['b1'], author: 'Carlos', timestamp: 400, subject: 'feat: c1' },
    { hash: 'd1', parents: ['a1'], author: 'David', timestamp: 350, subject: 'feat: d1' },
    { hash: 'b1', parents: ['a1'], author: 'Bob', timestamp: 300, subject: 'feat: b1' },
    { hash: 'a1', parents: ['m1'], author: 'Ana', timestamp: 200, subject: 'feat: a1' },
    { hash: 'm1', parents: [], author: 'Ana', timestamp: 100, subject: 'init' },
  ];

  const result = analyzeTopologyData(branches, commits);

  // feature/merged (fast-forward merge into dev)
  const mergedBranch = result.branches.find((b) => b.name === 'feature/merged');
  assert.strictEqual(mergedBranch.status, 'merged');
  assert.strictEqual(mergedBranch.forkPoint, 'b1'); // Forked from feature/prev!
  assert.strictEqual(mergedBranch.mergedCount, 2);
  assert.strictEqual(mergedBranch.unmergedCount, 0);
  assert.strictEqual(mergedBranch.commits.length, 2);
  assert.deepStrictEqual(mergedBranch.mergedCommits.map((c) => c.hash), ['c2', 'c1']);
  assert.deepStrictEqual(mergedBranch.unmergedCommits, []);

  // feature/diverged
  const divBranch = result.branches.find((b) => b.name === 'feature/diverged');
  assert.strictEqual(divBranch.status, 'diverged');
  assert.strictEqual(divBranch.forkPoint, 'a1');
  assert.strictEqual(divBranch.mergedCount, 0);
  assert.strictEqual(divBranch.unmergedCount, 1);
  assert.deepStrictEqual(divBranch.unmergedCommits.map((c) => c.hash), ['d1']);
});


