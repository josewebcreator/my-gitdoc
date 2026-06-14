import test from 'node:test';
import assert from 'node:assert';
import { groupForChangelog, groupForPap, renderDocument, parseInstructions, generateRemoteLinks } from '../../src/renderer.js';

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

test('renderDocument changelog - inyecta el body de los commits en modo verboso', async () => {
  const commits = [
    makeCommit({
      hash: 'v123',
      type: 'feat',
      subject: 'add support for verbose mode',
      body: 'This is the detailed explanation of how verbose mode works.'
    })
  ];

  // Test with verbose active
  const mdVerbose = await renderDocument(commits, 'changelog', { verbose: true });
  assert.ok(mdVerbose.includes('> This is the detailed explanation of how verbose mode works.'), 'Debe incluir el body en formato de cita');

  // Test with verbose inactive
  const mdSilent = await renderDocument(commits, 'changelog', { verbose: false });
  assert.ok(!mdSilent.includes('> This is the detailed explanation of how verbose mode works.'), 'No debe incluir el body');
});

test('renderDocument changelog - incluye commits poco relevantes en modo verboso', async () => {
  const commits = [
    makeCommit({ hash: 'c1', type: 'chore', subject: 'update npm run script', body: 'some chore details' }),
    makeCommit({ hash: 'd1', type: 'docs', subject: 'improve documentation layout', body: 'some docs details' })
  ];

  // In verbose mode, chore and docs must be present
  const mdVerbose = await renderDocument(commits, 'changelog', { verbose: true });
  assert.ok(mdVerbose.includes('Otros Cambios'), 'Debe incluir sección chore ("Otros Cambios")');
  assert.ok(mdVerbose.includes('Documentación'), 'Debe incluir sección docs ("Documentación")');
  assert.ok(mdVerbose.includes('update npm run script'), 'Debe incluir el commit chore');
  assert.ok(mdVerbose.includes('improve documentation layout'), 'Debe incluir el commit docs');
  assert.ok(mdVerbose.includes('> some chore details'), 'Debe incluir el body del commit chore');

  // In standard mode, chore and docs must NOT be present
  const mdSilent = await renderDocument(commits, 'changelog', { verbose: false });
  assert.ok(!mdSilent.includes('Otros Cambios'), 'No debe incluir sección chore');
  assert.ok(!mdSilent.includes('Documentación'), 'No debe incluir sección docs');
  assert.ok(!mdSilent.includes('update npm run script'), 'No debe incluir el commit chore');
});

// ---------------------------------------------------------------------------
// Hito 7 — parseInstructions
// ---------------------------------------------------------------------------

test('parseInstructions - extrae directivas RUN, ROLLBACK y VERIFY del body', () => {
  const body = `RUN: npm run migrate\nROLLBACK: npm run migrate:undo\nVERIFY: curl http://localhost/health`;
  const result = parseInstructions(body);

  assert.deepStrictEqual(result.run,      ['npm run migrate']);
  assert.deepStrictEqual(result.rollback, ['npm run migrate:undo']);
  assert.deepStrictEqual(result.verify,   ['curl http://localhost/health']);
});

test('parseInstructions - MIGRATE: va a la sección run', () => {
  const body = `MIGRATE: rails db:migrate`;
  const result = parseInstructions(body);

  assert.deepStrictEqual(result.run, ['rails db:migrate'], 'MIGRATE debe ir al arreglo run');
});

test('parseInstructions - acepta directivas en mayúsculas y minúsculas', () => {
  const body = `run: node seed.js\nrollback: node seed:undo.js\nverify: npm test`;
  const result = parseInstructions(body);

  assert.deepStrictEqual(result.run,      ['node seed.js']);
  assert.deepStrictEqual(result.rollback, ['node seed:undo.js']);
  assert.deepStrictEqual(result.verify,   ['npm test']);
});

test('parseInstructions - acumula múltiples directivas del mismo tipo', () => {
  const body = `RUN: step one\nRUN: step two\nVERIFY: check one\nVERIFY: check two`;
  const result = parseInstructions(body);

  assert.strictEqual(result.run.length,    2, 'debe haber 2 instrucciones run');
  assert.strictEqual(result.verify.length, 2, 'debe haber 2 instrucciones verify');
});

test('parseInstructions - ignora líneas sin directiva', () => {
  const body = `Este es un cuerpo normal sin directivas.\nSolo descripción del cambio.`;
  const result = parseInstructions(body);

  assert.deepStrictEqual(result.run,      []);
  assert.deepStrictEqual(result.rollback, []);
  assert.deepStrictEqual(result.verify,   []);
});

test('parseInstructions - retorna vacío si body es null o undefined', () => {
  const fromNull      = parseInstructions(null);
  const fromUndefined = parseInstructions(undefined);

  assert.deepStrictEqual(fromNull.run,      []);
  assert.deepStrictEqual(fromUndefined.run, []);
});

// ---------------------------------------------------------------------------
// Hito 7 — generateRemoteLinks
// ---------------------------------------------------------------------------

const REMOTE_URL = 'https://github.com/user/repo';

test('generateRemoteLinks - convierte hash de 7 caracteres en hipervínculo', () => {
  const result = generateRemoteLinks('commit abc1234 fue el responsable', REMOTE_URL);
  assert.ok(result.includes('[abc1234](https://github.com/user/repo/commit/abc1234)'));
});

test('generateRemoteLinks - convierte hash de 40 caracteres en hipervínculo', () => {
  const hash40 = 'a'.repeat(40);
  const result = generateRemoteLinks(`commit ${hash40}`, REMOTE_URL);
  assert.ok(result.includes(`[${hash40.slice(0, 7)}](${REMOTE_URL}/commit/${hash40})`));
});

test('generateRemoteLinks - convierte referencia #NNN en hipervínculo de issue', () => {
  const result = generateRemoteLinks('fix para el issue #42 cerrado', REMOTE_URL);
  assert.ok(result.includes('[#42](https://github.com/user/repo/issues/42)'));
});

test('generateRemoteLinks - maneja múltiples hashes e issues en el mismo texto', () => {
  const result = generateRemoteLinks('ver abc1234 y #99 para contexto', REMOTE_URL);
  assert.ok(result.includes('[abc1234](https://github.com/user/repo/commit/abc1234)'));
  assert.ok(result.includes('[#99](https://github.com/user/repo/issues/99)'));
});

test('generateRemoteLinks - retorna el texto sin cambios si remoteUrl no está definido', () => {
  const text = 'commit abc1234 y #10';
  const result = generateRemoteLinks(text, undefined);
  assert.strictEqual(result, text, 'el texto debe permanecer igual sin remoteUrl');
});

// ---------------------------------------------------------------------------
// Hito 7 — groupForPap con instrucciones estructuradas
// ---------------------------------------------------------------------------

test('groupForPap - enriquece commits con instrucciones parseadas del body', () => {
  const commits = [
    makeCommit({
      hash: 'p1',
      type: 'ci',
      scope: 'docker',
      subject: 'setup ci pipeline',
      body: 'RUN: docker-compose up\nROLLBACK: docker-compose down\nVERIFY: curl http://localhost',
    }),
  ];

  const { scopes } = groupForPap(commits);
  const commit = scopes[0].commits[0];

  assert.ok(commit.hasInstructions, 'debe marcar hasInstructions como true');
  assert.deepStrictEqual(commit.instructions.run,      ['docker-compose up']);
  assert.deepStrictEqual(commit.instructions.rollback, ['docker-compose down']);
  assert.deepStrictEqual(commit.instructions.verify,   ['curl http://localhost']);
});

test('groupForPap - hasInstructions es false si el body no tiene directivas', () => {
  const commits = [
    makeCommit({ hash: 'p2', type: 'build', scope: 'config', subject: 'update deps', body: 'solo descripción' }),
  ];

  const { scopes } = groupForPap(commits);
  const commit = scopes[0].commits[0];

  assert.strictEqual(commit.hasInstructions, false, 'no debe tener instrucciones');
});

// ---------------------------------------------------------------------------
// Hito 7 — renderDocument PAP con secciones estructuradas
// ---------------------------------------------------------------------------

test('renderDocument pap - genera secciones de Ejecución, Marcha Atrás y Pruebas de Humo', async () => {
  const commits = [
    makeCommit({
      hash: 'render1',
      type: 'ci',
      scope: 'docker',
      subject: 'setup ci pipeline',
      body: 'RUN: docker-compose up\nROLLBACK: docker-compose down\nVERIFY: curl http://localhost',
    }),
  ];

  const md = await renderDocument(commits, 'pap');

  assert.ok(md.includes('Ejecución'),       'debe incluir sección Ejecución');
  assert.ok(md.includes('Marcha Atrás'),    'debe incluir sección Marcha Atrás');
  assert.ok(md.includes('Pruebas de Humo'), 'debe incluir sección Pruebas de Humo');
  assert.ok(md.includes('docker-compose up'),     'debe incluir el comando RUN');
  assert.ok(md.includes('docker-compose down'),   'debe incluir el comando ROLLBACK');
  assert.ok(md.includes('curl http://localhost'), 'debe incluir el comando VERIFY');
});

test('renderDocument changelog - aplica autolinking cuando remoteUrl está configurado', async () => {
  const commits = [
    makeCommit({ hash: 'abc1234', type: 'feat', subject: 'implement feature #10' }),
  ];

  const md = await renderDocument(commits, 'changelog', { remoteUrl: REMOTE_URL });

  assert.ok(md.includes(`[abc1234](${REMOTE_URL}/commit/abc1234)`), 'debe linkear el hash');
  assert.ok(md.includes(`[#10](${REMOTE_URL}/issues/10)`),          'debe linkear el issue #10');
});

test('renderDocument changelog - NO aplica autolinking si remoteUrl no está definido', async () => {
  const commits = [
    makeCommit({ hash: 'abc1234', type: 'feat', subject: 'implement feature #10' }),
  ];

  const md = await renderDocument(commits, 'changelog');

  assert.ok(!md.includes('github.com'), 'no debe haber links de github sin remoteUrl');
});
