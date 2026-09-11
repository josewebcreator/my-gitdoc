import test from 'node:test';
import assert from 'node:assert';
import { calculateMergeSummaries, enrichCommits, generateHtmlViewer } from '../../src/graph/html.js';

test('calculateMergeSummaries - calculates git-style merge summary for merged branch', () => {
  const topologyData = {
    baseBranch: 'main',
    branches: [
      {
        name: 'main',
        isBase: true,
        targetCommit: 'commit_main_tip',
        status: 'base',
        commits: [{ hash: 'commit_main_1', subject: 'feat(core): initial base', author: 'Ana' }],
      },
      {
        name: 'feat/auth',
        status: 'merged',
        mergedInto: 'main',
        forkPoint: 'commit_fork_1234567',
        targetCommit: 'commit_auth_tip789',
        mergeCommit: 'commit_merge_abc',
        commits: [
          { hash: 'commit_auth_1', subject: 'feat(auth): login with jwt', author: 'Carlos' },
          { hash: 'commit_auth_2', subject: 'fix(auth): handle token expiration', author: 'Carlos' },
          { hash: 'commit_auth_3', subject: 'docs(auth): add api documentation', author: 'Elena' },
        ],
        mergedCommits: [
          { hash: 'commit_auth_1', subject: 'feat(auth): login with jwt', author: 'Carlos' },
          { hash: 'commit_auth_2', subject: 'fix(auth): handle token expiration', author: 'Carlos' },
          { hash: 'commit_auth_3', subject: 'docs(auth): add api documentation', author: 'Elena' },
        ],
      },
    ],
    merges: [],
  };

  const summaries = calculateMergeSummaries(topologyData);
  assert.strictEqual(summaries.length, 1);

  const authSummary = summaries[0];
  assert.strictEqual(authSummary.title, "Merge branch 'feat/auth' into 'main'");
  assert.strictEqual(authSummary.branch, 'feat/auth');
  assert.strictEqual(authSummary.target, 'main');
  assert.strictEqual(authSummary.totalCommits, 3);
  assert.deepStrictEqual(authSummary.contributors.sort(), ['Carlos', 'Elena'].sort());
  assert.strictEqual(authSummary.typesSummary.feat, 1);
  assert.strictEqual(authSummary.typesSummary.fix, 1);
  assert.strictEqual(authSummary.typesSummary.docs, 1);
  assert.strictEqual(authSummary.hashRange, 'commit_..commit_');
});

test('enrichCommits - classifies conventional commits, relevance and breaking changes', () => {
  const topologyData = {
    branches: [
      {
        name: 'feat/test',
        commits: [
          {
            hash: 'h1',
            subject: 'feat(api): new endpoint',
            body: 'Detailed description of api',
            author: 'Dev One',
          },
          {
            hash: 'h2',
            subject: 'wip: quick checkpoint commit',
            body: '',
            author: 'Dev One',
          },
          {
            hash: 'h3',
            subject: 'chore: bump dependencies',
            body: 'BREAKING CHANGE: updated major version',
            author: 'Dev Two',
          },
          {
            hash: 'h4',
            parents: ['p1', 'p2'],
            subject: 'Merge branch dev into main',
            isMerge: true,
            author: 'Dev Two',
          },
        ],
      },
    ],
  };

  const enriched = enrichCommits(topologyData);
  assert.strictEqual(enriched.length, 4);

  const featCommit = enriched.find((c) => c.hash === 'h1');
  assert.strictEqual(featCommit.isConventional, true);
  assert.strictEqual(featCommit.isRelevant, true);
  assert.strictEqual(featCommit.type, 'feat');
  assert.strictEqual(featCommit.scope, 'api');

  const wipCommit = enriched.find((c) => c.hash === 'h2');
  assert.strictEqual(wipCommit.isConventional, false);
  assert.strictEqual(wipCommit.isRelevant, false);

  const breakingChore = enriched.find((c) => c.hash === 'h3');
  assert.strictEqual(breakingChore.isConventional, true);
  assert.strictEqual(breakingChore.type, 'chore');
  assert.strictEqual(breakingChore.isRelevant, true, 'Breaking changes should be considered relevant even in chore');

  const mergeCommit = enriched.find((c) => c.hash === 'h4');
  assert.strictEqual(mergeCommit.isMerge, true);
  assert.strictEqual(mergeCommit.isRelevant, true, 'Merge commits should be relevant');
});

test('generateHtmlViewer - produces self-contained bundle with embedded data and zero external CDNs', async () => {
  const topologyData = {
    baseBranch: 'main',
    branches: [
      {
        name: 'main',
        isBase: true,
        targetCommit: 'abcdef1234567890',
        status: 'base',
        commits: [
          { hash: 'abcdef1234567890', subject: 'feat(core): initial setup', author: 'Alice' },
        ],
      },
    ],
    summary: {
      totalBranches: 1,
      activeBranches: 1,
      mergedBranches: 0,
      divergedBranches: 0,
      totalCommits: 1,
    },
  };

  const collaboratorsData = {
    global: [{ name: 'Alice', commitsCount: 1, types: { feat: 1 }, scopes: ['core'] }],
    branches: {},
  };

  const html = await generateHtmlViewer(topologyData, collaboratorsData, {
    lang: 'es',
    verbose: true,
    remoteUrl: 'https://github.com/myorg/myrepo',
  });

  // Validaciones básicas de HTML autocontenido
  assert.ok(html.startsWith('<!DOCTYPE html>'), 'Debe comenzar con DOCTYPE html');
  assert.ok(html.includes('<html lang="es"'), 'Debe incluir idioma configurado');
  assert.ok(html.includes('<script id="gitdoc-data" type="application/json">'), 'Debe contener etiqueta script con gitdoc-data');

  // Validar que NO contenga enlaces externos http/https a recursos estáticos (RNF-8 offline)
  assert.doesNotMatch(html, /<script[^>]+src=["']http/i, 'No debe cargar scripts externos');
  assert.doesNotMatch(html, /<link[^>]+href=["']http/i, 'No debe cargar hojas de estilo externas');

  // Validar tokens de diseño nativo GitLab y reglas de impresión
  assert.ok(html.includes('--gl-bg: #18191d'), 'Debe definir token de color nativo de GitLab');
  assert.ok(html.includes('--gl-status-base'), 'Debe definir token de estado base');
  assert.ok(html.includes('@media print'), 'Debe contener reglas de hoja de estilo para impresión');

  // Validar payload parseable en JSON
  const match = html.match(/<script\s+id="gitdoc-data"\s+type="application\/json">\s*([\s\S]*?)\s*<\/script>/);
  assert.ok(match, 'Debe extraerse el bloque JSON incrustado');

  const parsedData = JSON.parse(match[1]);
  assert.strictEqual(parsedData.topology.baseBranch, 'main');
  assert.strictEqual(parsedData.topology.branches.length, 1);
  assert.strictEqual(parsedData.options.verbose, true);
  assert.strictEqual(parsedData.options.remoteUrl, 'https://github.com/myorg/myrepo');
});

test('generateHtmlViewer - supports English language configuration', async () => {
  const topologyData = {
    baseBranch: 'dev',
    branches: [{ name: 'dev', isBase: true, commits: [] }],
  };

  const html = await generateHtmlViewer(topologyData, {}, { lang: 'en' });
  assert.ok(html.includes('<html lang="en"'), 'Debe configurar atributo lang en inglés');
});
