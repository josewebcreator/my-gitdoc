import test from 'node:test';
import assert from 'node:assert';
import { exec } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.resolve(__dirname, '../../bin/cli.js');

function runCli(args, cwd = null) {
  return new Promise((resolve) => {
    const options = {};
    if (cwd) {
      options.cwd = cwd;
      options.env = {
        ...process.env,
        GIT_CEILING_DIRECTORIES: path.dirname(cwd),
      };
    }
    exec(`node "${cliPath}" ${args}`, options, (error, stdout, stderr) => {
      resolve({ code: error ? error.code : 0, stdout, stderr, error });
    });
  });
}

test('CLI Topology - succeeds with exit code 0 and displays topology', async () => {
  const { code, stdout } = await runCli('topology');
  assert.strictEqual(code, 0);
  assert.ok(stdout.includes('Gitdoc'));
  assert.ok(stdout.includes('main'));
});

test('CLI Topology - alias graph succeeds with exit code 0', async () => {
  const { code, stdout } = await runCli('graph');
  assert.strictEqual(code, 0);
  assert.ok(stdout.includes('Gitdoc'));
  assert.ok(stdout.includes('main'));
});

test('CLI Topology - localized English output with --lang en', async () => {
  const { code, stdout } = await runCli('topology --lang en');
  assert.strictEqual(code, 0);
  assert.ok(stdout.includes('Topological Analysis & Contributors'), 'Should have English title');
  assert.ok(stdout.includes('Base Branch:'), 'Should have English Base Branch label');
  assert.ok(stdout.includes('Total Branches:'), 'Should have English Total Branches label');
  assert.ok(stdout.includes('Collaborators:'), 'Should have English Collaborators label');
});

test('CLI Topology - localized Spanish output with --lang es', async () => {
  const { code, stdout } = await runCli('topology --lang es');
  assert.strictEqual(code, 0);
  assert.ok(stdout.includes('Análisis Topológico y Colaboradores'), 'Should have Spanish title');
  assert.ok(stdout.includes('Rama Base:'), 'Should have Spanish Rama Base label');
  assert.ok(stdout.includes('Ramas Totales:'), 'Should have Spanish Ramas Totales label');
  assert.ok(stdout.includes('Colaboradores:'), 'Should have Spanish Colaboradores label');
});

test('CLI Topology - outputs valid JSON with --json', async () => {
  const { code, stdout } = await runCli('topology --json');
  assert.strictEqual(code, 0);
  const parsed = JSON.parse(stdout);
  assert.ok(parsed.topology);
  assert.ok(parsed.collaborators);
  assert.strictEqual(parsed.topology.baseBranch, 'main');
});

test('CLI Topology Error - fails with code 1 in non-git directory (Spanish)', async () => {
  const nonGitDir = path.resolve(__dirname, '../tmp-non-git-dir-topo');
  if (!fs.existsSync(nonGitDir)) {
    fs.mkdirSync(nonGitDir, { recursive: true });
  }

  try {
    const { code, stderr } = await runCli('topology --lang es', nonGitDir);
    assert.strictEqual(code, 1);
    assert.ok(
      stderr.includes('El directorio actual no es un repositorio Git válido.'),
      'Should display Spanish notGitRepo error'
    );
  } finally {
    if (fs.existsSync(nonGitDir)) {
      fs.rmSync(nonGitDir, { recursive: true, force: true });
    }
  }
});

test('CLI Topology Error - fails with code 1 in non-git directory (English)', async () => {
  const nonGitDir = path.resolve(__dirname, '../tmp-non-git-dir-topo-en');
  if (!fs.existsSync(nonGitDir)) {
    fs.mkdirSync(nonGitDir, { recursive: true });
  }

  try {
    const { code, stderr } = await runCli('topology --lang en', nonGitDir);
    assert.strictEqual(code, 1);
    assert.ok(
      stderr.includes('The current directory is not a valid Git repository.'),
      'Should display English notGitRepo error'
    );
  } finally {
    if (fs.existsSync(nonGitDir)) {
      fs.rmSync(nonGitDir, { recursive: true, force: true });
    }
  }
});

test('CLI Topology Error - fails when specified --branch is not found (localized)', async () => {
  const { code, stderr } = await runCli('topology --branch rama-que-no-existe --lang es');
  assert.strictEqual(code, 1);
  assert.ok(
    stderr.includes('No se encontró la rama especificada "rama-que-no-existe".'),
    'Should display Spanish branchNotFound error'
  );

  const resEn = await runCli('topology --branch non-existent-branch --lang en');
  assert.strictEqual(resEn.code, 1);
  assert.ok(
    resEn.stderr.includes('Specified branch "non-existent-branch" was not found.'),
    'Should display English branchNotFound error'
  );
});

test('CLI Topology Error - fails when --since format is invalid (localized)', async () => {
  const { code, stderr } = await runCli('topology --since fecha-invalida --lang es');
  assert.strictEqual(code, 1);
  assert.ok(
    stderr.includes('Formato de fecha inválido para el filtro: "fecha-invalida".'),
    'Should display Spanish invalidDate error'
  );

  const resEn = await runCli('topology --since invalid-date --lang en');
  assert.strictEqual(resEn.code, 1);
  assert.ok(
    resEn.stderr.includes('Invalid date format for filter: "invalid-date".'),
    'Should display English invalidDate error'
  );
});
