import test from 'node:test';
import assert from 'node:assert';
import { groupForChangelog, groupForPap, renderDocument } from '../../src/renderer.js';

// ---------------------------------------------------------------------------
// Fixtures — commits de prueba
// ---------------------------------------------------------------------------

const makeCommit = (overrides) => ({
  hash: 'abc1234',
  type: 'feat',
  scope: null,
  subject: 'do something',
  body: null,
  notes: [],
  ...overrides,
});

const sampleCommits = [
  makeCommit({ hash: 'h1', type: 'feat',     scope: 'auth',   subject: 'add login endpoint' }),
  makeCommit({ hash: 'h2', type: 'fix',      scope: 'auth',   subject: 'fix token expiry' }),
  makeCommit({ hash: 'h3', type: 'perf',     scope: 'api',    subject: 'optimize query' }),
  makeCommit({ hash: 'h4', type: 'refactor', scope: 'api',    subject: 'clean pipeline code' }),
  makeCommit({ hash: 'h5', type: 'docs',     scope: 'readme', subject: 'update readme' }),  // debe ser excluido en changelog
  makeCommit({ hash: 'h6', type: 'chore',    scope: null,     subject: 'update deps' }),     // debe ser excluido en changelog
  makeCommit({ hash: 'h7', type: 'ci',       scope: 'docker', subject: 'add docker job' }),
  makeCommit({ hash: 'h8', type: 'build',    scope: 'config', subject: 'update build script' }),
  makeCommit({ hash: 'h9', type: 'feat',     scope: 'infra',  subject: 'add infra automation' }),
  makeCommit({
    hash: 'hB',
    type: 'feat',
    scope: 'core',
    subject: 'drop legacy API',
    notes: [{ title: 'BREAKING CHANGE', text: 'Old v1 endpoints removed' }],
  }),
];

// ---------------------------------------------------------------------------
// groupForChangelog — Criterio de Aceptación 1
// ---------------------------------------------------------------------------

test('groupForChangelog - incluye solo feat, fix, perf, refactor', () => {
  const { sections } = groupForChangelog(sampleCommits);
  const allTypes = sections.flatMap(s => s.commits).map(c => c.type);

  assert.ok(allTypes.includes('feat'),     'debe incluir feat');
  assert.ok(allTypes.includes('fix'),      'debe incluir fix');
  assert.ok(allTypes.includes('perf'),     'debe incluir perf');
  assert.ok(allTypes.includes('refactor'), 'debe incluir refactor');
  assert.ok(!allTypes.includes('docs'),    'no debe incluir docs');
  assert.ok(!allTypes.includes('chore'),   'no debe incluir chore');
  assert.ok(!allTypes.includes('ci'),      'no debe incluir ci');
});

test('groupForChangelog - aisla breaking changes en sección propia', () => {
  const { breakingChanges, sections } = groupForChangelog(sampleCommits);

  assert.ok(breakingChanges.length >= 1, 'debe haber al menos un breaking change');
  const bc = breakingChanges.find(c => c.hash === 'hB');
  assert.ok(bc, 'el commit hB (breaking change) debe estar en breakingChanges');
  assert.strictEqual(bc.note, 'Old v1 endpoints removed');
});

test('groupForChangelog - secciones tienen títulos en español', () => {
  const { sections } = groupForChangelog(sampleCommits);
  const titles = sections.map(s => s.title);

  assert.ok(titles.some(t => t === 'Nuevas Características'), 'feat → "Nuevas Características"');
  assert.ok(titles.some(t => t === 'Correcciones de Bugs'),   'fix  → "Correcciones de Bugs"');
});

test('groupForChangelog - respeta filtro --scope', () => {
  const { sections } = groupForChangelog(sampleCommits, 'auth');
  const allCommits = sections.flatMap(s => s.commits);

  assert.ok(allCommits.length >= 1, 'debe haber commits con scope auth');
  assert.ok(allCommits.every(c => c.scope === 'auth'), 'todos los commits deben ser de scope auth');
});

test('groupForChangelog - sin commits válidos retorna vacío', () => {
  const only_docs = [makeCommit({ type: 'docs' }), makeCommit({ type: 'chore' })];
  const { breakingChanges, sections } = groupForChangelog(only_docs);

  assert.strictEqual(breakingChanges.length, 0);
  assert.strictEqual(sections.length, 0);
});

// ---------------------------------------------------------------------------
// groupForPap — Criterio de Aceptación 2
// ---------------------------------------------------------------------------

test('groupForPap - incluye ci y build', () => {
  const { scopes } = groupForPap(sampleCommits);
  const allCommits = scopes.flatMap(s => s.commits);
  const types = allCommits.map(c => c.type);

  assert.ok(types.includes('ci'),    'debe incluir ci');
  assert.ok(types.includes('build'), 'debe incluir build');
});

test('groupForPap - incluye commits con scopes de infraestructura', () => {
  const { scopes } = groupForPap(sampleCommits);
  const allCommits = scopes.flatMap(s => s.commits);
  const scopeNames = allCommits.map(c => c.scope).filter(Boolean);

  const infraScopes = ['db', 'infra', 'docker', 'config'];
  const hasInfraScope = scopeNames.some(s => infraScopes.includes(s));
  assert.ok(hasInfraScope, 'debe incluir al menos un commit con scope de infraestructura');
});

test('groupForPap - excluye commits sin tipo infra ni scope infra', () => {
  const { scopes } = groupForPap(sampleCommits);
  const allCommits = scopes.flatMap(s => s.commits);

  // docs y chore sin scope infra no deben aparecer
  const hasDocs  = allCommits.some(c => c.type === 'docs');
  const hasChore = allCommits.some(c => c.type === 'chore');
  assert.ok(!hasDocs,  'no debe incluir docs');
  assert.ok(!hasChore, 'no debe incluir chore');
});

test('groupForPap - agrupa por scope', () => {
  const { scopes } = groupForPap(sampleCommits);

  assert.ok(scopes.length >= 1, 'debe haber al menos un scope');
  for (const s of scopes) {
    assert.ok(typeof s.scope === 'string', 'cada grupo debe tener clave scope');
    assert.ok(Array.isArray(s.commits),    'cada grupo debe tener array commits');
  }
});

test('groupForPap - respeta filtro --scope', () => {
  const { scopes } = groupForPap(sampleCommits, 'docker');

  assert.ok(scopes.length >= 1, 'debe haber al menos un scope docker');
  assert.ok(scopes.every(s => s.scope === 'docker'), 'solo el scope docker debe aparecer');
});

// ---------------------------------------------------------------------------
// renderDocument — integración con Handlebars
// ---------------------------------------------------------------------------

test('renderDocument - retorna markdown no vacío para changelog', async () => {
  const commits = [makeCommit({ hash: 'r1', type: 'feat', subject: 'great feature' })];
  const md = await renderDocument(commits, 'changelog');

  assert.ok(typeof md === 'string', 'debe retornar un string');
  assert.ok(md.includes('# CHANGELOG'), 'debe incluir el encabezado de CHANGELOG');
});

test('renderDocument - retorna markdown no vacío para pap', async () => {
  const commits = [makeCommit({ hash: 'r2', type: 'ci', scope: 'docker', subject: 'add ci step' })];
  const md = await renderDocument(commits, 'pap');

  assert.ok(typeof md === 'string', 'debe retornar un string');
  assert.ok(md.includes('Procedimiento de Puesta en Producción'), 'debe incluir el encabezado de PAP');
});

test('renderDocument changelog - breaking changes aparecen en el markdown', async () => {
  const commits = [
    makeCommit({
      hash: 'r3',
      type: 'feat',
      subject: 'remove old API',
      notes: [{ title: 'BREAKING CHANGE', text: 'v1 removed' }],
    }),
  ];
  const md = await renderDocument(commits, 'changelog');

  assert.ok(md.includes('Breaking Changes'), 'debe incluir sección de Breaking Changes');
  assert.ok(md.includes('remove old API'),   'debe incluir el subject del commit');
});
