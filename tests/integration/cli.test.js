import test from 'node:test';
import assert from 'node:assert';
import { exec } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.resolve(__dirname, '../../bin/cli.js');

function runCli(args) {
  return new Promise((resolve) => {
    exec(`node "${cliPath}" ${args}`, (error, stdout, stderr) => {
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
  assert.ok(stdout.includes('Generando changelog...'), 'Should output progress message');
});

test('CLI - should succeed with exit code 0 when tipo is pap', async () => {
  const { code, stdout, stderr } = await runCli('generate pap');
  assert.strictEqual(code, 0, 'Exit code should be 0');
  assert.ok(stdout.includes('Generando pap...'), 'Should output progress message');
});
