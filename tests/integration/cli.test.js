import test from 'node:test';
import assert from 'node:assert';
import { exec } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { unlink } from 'node:fs/promises';
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
        GIT_CEILING_DIRECTORIES: path.dirname(cwd)
      };
    }
    exec(`node "${cliPath}" ${args}`, options, (error, stdout, stderr) => {
      resolve({ code: error ? error.code : 0, stdout, stderr, error });
    });
  });
}

test('CLI - should fail with exit code 1 and red error when tipo is invalid', async () => {
  const { code, stdout, stderr } = await runCli('generate invalid');
  assert.strictEqual(code, 1, 'Exit code should be 1');
  assert.ok(stderr.includes('Error: El tipo de documento "invalid" no es válido. Debe ser "changelog" o "pap".'), 'Error message should match');
  assert.ok(stderr.includes('\u001b[31m') || stderr.includes('\x1b[31m'), 'Error message should be colored red');
});

test('CLI - should succeed with exit code 0 when tipo is changelog', async () => {
  const { code, stdout, stderr } = await runCli('generate changelog');
  assert.strictEqual(code, 0, 'Exit code should be 0');
  assert.ok(stdout.includes('CHANGELOG.md'), 'Should report CHANGELOG.md was written');
  // Cleanup generated file
  try { await unlink(path.resolve(process.cwd(), 'CHANGELOG.md')); } catch {}
});

test('CLI - should succeed with exit code 0 when tipo is pap', async () => {
  const { code, stdout, stderr } = await runCli('generate pap');
  assert.strictEqual(code, 0, 'Exit code should be 0');
  assert.ok(stdout.includes('PAP.md'), 'Should report PAP.md was written');
  // Cleanup generated file
  try { await unlink(path.resolve(process.cwd(), 'PAP.md')); } catch {}
});

test('CLI - should fail with exit code 1 and red error when running in a non-git directory', async () => {
  const nonGitDir = path.resolve(__dirname, '../tmp-non-git-dir');
  if (!fs.existsSync(nonGitDir)) {
    fs.mkdirSync(nonGitDir, { recursive: true });
  }

  try {
    const { code, stderr } = await runCli('generate changelog', nonGitDir);
    assert.strictEqual(code, 1, 'Exit code should be 1');
    assert.ok(stderr.includes('Error: El directorio actual no es un repositorio Git válido.'), 'Error message should match');
    assert.ok(stderr.includes('\u001b[31m') || stderr.includes('\x1b[31m'), 'Error message should be colored red');
  } finally {
    if (fs.existsSync(nonGitDir)) {
      fs.rmSync(nonGitDir, { recursive: true, force: true });
    }
  }
});

test('CLI - should fail with exit code 1 and red error when reference is invalid', async () => {
  const { code, stderr } = await runCli('generate changelog --from non-existent-ref');
  assert.strictEqual(code, 1, 'Exit code should be 1');
  assert.ok(stderr.includes('Error: La referencia "non-existent-ref" no existe'), 'Error message should match');
  assert.ok(stderr.includes('\u001b[31m') || stderr.includes('\x1b[31m'), 'Error message should be colored red');
});

test('CLI - should succeed and output Markdown when --dry-run is passed', async () => {
  const { code, stdout } = await runCli('generate changelog --dry-run');
  assert.strictEqual(code, 0, 'Exit code should be 0');

  // stdout debe contener el encabezado de CHANGELOG (Markdown)
  assert.ok(stdout.includes('# CHANGELOG'), 'Output should be a Markdown CHANGELOG');
  // No debe intentar parsear como JSON — el contrato cambió en hito 4
});

