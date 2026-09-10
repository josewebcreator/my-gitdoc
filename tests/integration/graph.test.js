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
        GIT_CEILING_DIRECTORIES: path.dirname(cwd),
      };
    }
    exec(`node "${cliPath}" ${args}`, options, (error, stdout, stderr) => {
      resolve({ code: error ? error.code : 0, stdout, stderr, error });
    });
  });
}

test('CLI - should succeed with exit code 0 when tipo is graph', async () => {
  const outputPath = path.resolve(process.cwd(), 'GRAPH.md');
  try { await unlink(outputPath); } catch {}

  const { code, stdout } = await runCli('generate graph');
  assert.strictEqual(code, 0, 'Exit code should be 0');
  assert.ok(stdout.includes('GRAPH.md'), 'Should report GRAPH.md was written');
  assert.ok(fs.existsSync(outputPath), 'GRAPH.md file should exist');

  const content = fs.readFileSync(outputPath, 'utf-8');
  assert.ok(content.includes('```mermaid'), 'Should contain mermaid code block');
  assert.ok(content.includes('gitGraph'), 'Detailed mode should default to gitGraph');
  assert.ok(content.includes('|'), 'Should contain markdown table');

  try { await unlink(outputPath); } catch {}
});

test('CLI - should generate flowchart LR when --simplified is passed', async () => {
  const outputPath = path.resolve(process.cwd(), 'GRAPH.md');
  try { await unlink(outputPath); } catch {}

  const { code, stdout } = await runCli('generate graph --simplified');
  assert.strictEqual(code, 0, 'Exit code should be 0');
  assert.ok(fs.existsSync(outputPath), 'GRAPH.md file should exist');

  const content = fs.readFileSync(outputPath, 'utf-8');
  assert.ok(content.includes('```mermaid'), 'Should contain mermaid code block');
  assert.ok(content.includes('flowchart LR'), 'Simplified mode should use flowchart LR');
  assert.ok(content.includes('classDef'), 'Simplified mode should include styling classes');

  try { await unlink(outputPath); } catch {}
});

test('CLI - should output terminal tree and not write files when --dry-run is passed', async () => {
  const outputPath = path.resolve(process.cwd(), 'GRAPH.md');
  try { await unlink(outputPath); } catch {}

  const { code, stdout } = await runCli('generate graph --dry-run');
  assert.strictEqual(code, 0, 'Exit code should be 0');
  assert.ok(stdout.includes('📌'), 'Dry run should output root tree icon');
  assert.strictEqual(fs.existsSync(outputPath), false, 'GRAPH.md must NOT be created in dry-run');
});

test('CLI - graph --dry-run command emits terminal tree', async () => {
  const { code, stdout } = await runCli('graph --dry-run');
  assert.strictEqual(code, 0, 'Exit code should be 0');
  assert.ok(stdout.includes('📌'), 'Should output terminal tree');
  assert.ok(stdout.includes('commits'), 'Should display commit counts');
});

test('CLI - generates English headers when --lang en is passed', async () => {
  const outputPath = path.resolve(process.cwd(), 'GRAPH.md');
  try { await unlink(outputPath); } catch {}

  const { code } = await runCli('generate graph --lang en');
  assert.strictEqual(code, 0);
  assert.ok(fs.existsSync(outputPath));

  const content = fs.readFileSync(outputPath, 'utf-8');
  assert.ok(content.includes('Git Branch and Topology Graph'), 'Should include English title');
  assert.ok(content.includes('Branch Contributors Summary'), 'Should include English table header');

  try { await unlink(outputPath); } catch {}
});
