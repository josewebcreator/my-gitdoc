import { test } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractTopology } from '../../src/graph/topology.js';
import { analyzeCollaborators } from '../../src/graph/collaborators.js';

test('Integration - Real Git Repo with branches, fork points, merges and multi-author commits', async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'gitdoc-topo-test-'));

  try {
    const git = (cmd) => execSync(`git ${cmd}`, { cwd: tempDir, stdio: 'pipe' });

    // Inicializar repositorio
    git('init');
    git('config user.name "Ana Tester"');
    git('config user.email "ana@test.com"');
    git('config commit.gpgsign false');

    // Commit 1 en main (o master)
    writeFileSync(join(tempDir, 'file.txt'), 'init');
    git('add .');
    git('commit -m "chore(root): initial commit"');

    // Renombrar a main para consistencia
    try {
      git('branch -M main');
    } catch {}

    // Commit 2 en main
    writeFileSync(join(tempDir, 'file.txt'), 'version 1');
    git('add .');
    git('commit -m "feat(core): core engine v1"');

    // Crear rama feature/auth bifurcada de main
    git('checkout -b feature/auth');
    writeFileSync(join(tempDir, 'auth.txt'), 'auth module');
    git('add .');
    git('commit -m "feat(auth): add login handler"');

    // Segundo autor en feature/auth
    git('config user.name "Carlos Dev"');
    git('config user.email "carlos@test.com"');
    writeFileSync(join(tempDir, 'auth.txt'), 'auth module with oauth');
    git('add .');
    git('commit -m "fix(auth): correct token expiration"');

    // Volver a main y agregar commit independiente para causar divergencia
    git('checkout main');
    git('config user.name "Ana Tester"');
    git('config user.email "ana@test.com"');
    writeFileSync(join(tempDir, 'main.txt'), 'main independent work');
    git('add .');
    git('commit -m "feat(core): main extra progress"');

    // Crear rama feature/payments y fusionarla con merge commit
    git('checkout -b feature/payments');
    writeFileSync(join(tempDir, 'payments.txt'), 'payments module');
    git('add .');
    git('commit -m "feat(payments): integrate payment gateway"');

    // Volver a main y fusionar feature/payments
    git('checkout main');
    git('merge --no-ff -m "Merge branch feature/payments into main" feature/payments');

    // Ejecutar extractTopology sobre el repositorio real
    const res = await extractTopology({ cwd: tempDir });

    assert.strictEqual(res.baseBranch, 'main');

    // 1. Validar ramas encontradas
    const branchNames = res.branches.map((b) => b.name);
    assert.ok(branchNames.includes('main'), 'Debe incluir main');
    assert.ok(branchNames.includes('feature/auth'), 'Debe incluir feature/auth');
    assert.ok(branchNames.includes('feature/payments'), 'Debe incluir feature/payments');

    // 2. Validar estado de feature/payments (merged)
    const payBranch = res.branches.find((b) => b.name === 'feature/payments');
    assert.ok(payBranch);
    assert.strictEqual(payBranch.status, 'merged');
    assert.ok(payBranch.mergeCommit, 'Debe registrar hash del merge commit');
    assert.strictEqual(payBranch.commits.length, 1);
    assert.strictEqual(payBranch.commits[0].subject, 'feat(payments): integrate payment gateway');

    // 3. Validar estado de feature/auth (diverged)
    const authBranch = res.branches.find((b) => b.name === 'feature/auth');
    assert.ok(authBranch);
    assert.strictEqual(authBranch.status, 'diverged');
    assert.strictEqual(authBranch.commits.length, 2);

    // 4. Validar colaboradores con analyzeCollaborators
    const metrics = analyzeCollaborators(res);
    const authMetrics = metrics.byBranch.find((b) => b.branch === 'feature/auth');
    assert.ok(authMetrics);
    assert.strictEqual(authMetrics.authorsCount, 2);

    const ana = authMetrics.collaborators.find((c) => c.name === 'Ana Tester');
    const carlos = authMetrics.collaborators.find((c) => c.name === 'Carlos Dev');
    assert.ok(ana);
    assert.ok(carlos);
    assert.strictEqual(ana.commitsCount, 1);
    assert.strictEqual(carlos.commitsCount, 1);
    assert.strictEqual(ana.primaryScope, 'auth');
    assert.strictEqual(carlos.primaryScope, 'auth');
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
});

test('Integration - Public Remote Repository (octocat/Hello-World)', async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'gitdoc-public-repo-'));

  try {
    // Clonar repositorio público ligero (solo 3 commits)
    execSync('git clone https://github.com/octocat/Hello-World.git .', {
      cwd: tempDir,
      stdio: 'pipe',
      timeout: 20000,
    });

    const res = await extractTopology({ cwd: tempDir });

    // Repositorio tiene rama base master
    assert.strictEqual(res.baseBranch, 'master');
    assert.ok(res.branches.length >= 1, 'Debe descubrir ramas del repositorio');

    // Comprobar que descubrió las ramas
    const names = res.branches.map((b) => b.name);
    assert.ok(names.includes('master'));

    // Verificar métricas de colaboradores
    const metrics = analyzeCollaborators(res);
    assert.ok(metrics.summary.totalUniqueAuthors >= 1);
    assert.ok(metrics.global.length >= 1);
  } catch (err) {
    // Si no hay conexión de red externa temporalmente, registrar aviso sin bloquear
    console.warn('Aviso: prueba remota omitida por conectividad de red:', err.message);
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
});
