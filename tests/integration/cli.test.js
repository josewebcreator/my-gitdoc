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

test('CLI - should respect local .gitdocrc.json and merge rules', async () => {
  const localConfigPath = path.resolve(process.cwd(), '.gitdocrc.json');
  // Write a configuration where "feat" is forbidden to trigger lint failure
  const testRules = {
    forbiddenTerms: {
      "feat": "something_else"
    }
  };
  fs.writeFileSync(localConfigPath, JSON.stringify(testRules), 'utf-8');

  try {
    const { code, stderr } = await runCli('generate changelog');
    // It should fail because there is at least one "feat" commit in the repository
    assert.strictEqual(code, 1, 'Exit code should be 1 due to lint violation');
    assert.ok(stderr.includes('El commit contiene el término prohibido "feat"'), 'Should report forbidden term "feat"');
  } finally {
    try { fs.unlinkSync(localConfigPath); } catch {}
  }
});

test('CLI - should support --output and create intermediate directories', async () => {
  const customOutputDir = path.resolve(process.cwd(), 'tests/tmp-out-dir/subdir');
  const customOutputPath = path.resolve(customOutputDir, 'TEST_OUTPUT.md');
  
  // Cleanup any left-overs
  try { fs.unlinkSync(customOutputPath); } catch {}
  try { fs.rmdirSync(customOutputDir); } catch {}

  try {
    const { code, stdout } = await runCli(`generate changelog -o tests/tmp-out-dir/subdir/TEST_OUTPUT.md`);
    assert.strictEqual(code, 0, 'Exit code should be 0');
    assert.ok(fs.existsSync(customOutputPath), 'Output file should exist');
    
    const content = fs.readFileSync(customOutputPath, 'utf-8');
    assert.ok(content.includes('# CHANGELOG'), 'File content should be changelog');
  } finally {
    try { fs.unlinkSync(customOutputPath); } catch {}
    try { fs.rmSync(path.resolve(process.cwd(), 'tests/tmp-out-dir'), { recursive: true, force: true }); } catch {}
  }
});

test('CLI - should support --template', async () => {
  const tempTemplatePath = path.resolve(process.cwd(), 'tests/tmp-template.hbs');
  fs.writeFileSync(tempTemplatePath, 'CUSTOM TEMPLATE: {{#each sections}}{{title}}{{/each}}', 'utf-8');

  try {
    const { code, stdout } = await runCli(`generate changelog -t tests/tmp-template.hbs --dry-run`);
    assert.strictEqual(code, 0, 'Exit code should be 0');
    assert.ok(stdout.includes('CUSTOM TEMPLATE:'), 'Output should render using the custom template');
  } finally {
    try { fs.unlinkSync(tempTemplatePath); } catch {}
  }
});

test('CLI - should support --verbose', async () => {
  const { code, stdout } = await runCli('generate changelog -v --dry-run');
  assert.strictEqual(code, 0, 'Exit code should be 0');
  assert.ok(stdout.includes('# CHANGELOG'), 'Output should contain changelog');
});

