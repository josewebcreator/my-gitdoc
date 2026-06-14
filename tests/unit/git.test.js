import { mock, test } from 'node:test';
import assert from 'node:assert';
import { Readable } from 'node:stream';

// Mock state variables
let isRepo = true;
let commitCount = '2';
let latestTag = null;
let validReferences = new Set();
let capturedSpawnArgs = null;
let mockStdoutLines = [];
let spawnExitCode = 0;

// Helper to consume async generator
async function consume(iterator) {
  const result = [];
  for await (const item of iterator) {
    result.push(item);
  }
  return result;
}

mock.module('node:child_process', {
  namedExports: {
    spawn: (cmd, args) => {
      capturedSpawnArgs = args;
      const stdout = Readable.from(mockStdoutLines.length > 0 ? mockStdoutLines.join('\n') + '\n' : '');
      return {
        stdout,
        on: (event, cb) => {
          if (event === 'close') {
            // setTimeout to let streams flush
            setTimeout(() => cb(spawnExitCode), 10);
          }
        }
      };
    }
  }
});

// Mock simple-git module before importing git.js
mock.module('simple-git', {
  exports: {
    simpleGit: () => {
      return {
        checkIsRepo: async () => {
          if (!isRepo) throw new Error('Not a git repository');
          return isRepo;
        },
        raw: async (args) => {
          if (args[0] === 'rev-list' && args.includes('--all') && args.includes('--count')) {
            if (commitCount === '0') {
              throw new Error('fatal: not a git repository');
            }
            return commitCount;
          }
          return '';
        },
        revparse: async (args) => {
          if (args[0] === '--verify') {
            const ref = args[1];
            if (!validReferences.has(ref)) {
              throw new Error(`fatal: Needed a single revision`);
            }
            return ref;
          }
          return '';
        },
        tags: async () => {
          return { latest: latestTag };
        }
      };
    }
  }
});

// Import the module under test after registering the mock module
const { getCommits } = await import('../../src/git.js');

test('getCommits - throws error when directory is not a git repo', async () => {
  isRepo = false;
  await assert.rejects(
    consume(getCommits()),
    /El directorio actual no es un repositorio Git válido\./
  );
});

test('getCommits - throws error when repository has no commits', async () => {
  isRepo = true;
  commitCount = '0';
  await assert.rejects(
    consume(getCommits()),
    /El repositorio no tiene commits\./
  );
});

test('getCommits - successful extraction of all commits', async () => {
  isRepo = true;
  commitCount = '2';
  latestTag = null;
  validReferences = new Set(['HEAD']);
  capturedSpawnArgs = null;
  spawnExitCode = 0;
  
  mockStdoutLines = [
    '-----GIT-DOC-COMMIT-----',
    'h2',
    'fix(api): second commit',
    '',
    'This is a fix.',
    '-----GIT-DOC-COMMIT-----',
    'h1',
    'feat(core): first commit'
  ];

  const commits = await consume(getCommits());
  assert.strictEqual(commits.length, 2);
  assert.strictEqual(commits[0].hash, 'h2');
  assert.strictEqual(commits[0].inspectMessage, 'fix(api): second commit\n\nThis is a fix.');
  assert.strictEqual(commits[1].hash, 'h1');
  assert.strictEqual(commits[1].inspectMessage, 'feat(core): first commit');
  assert.ok(capturedSpawnArgs.includes('HEAD')); // actually without from it shouldn't have ranges unless to is provided
});

test('getCommits - throws error when --to reference is invalid', async () => {
  isRepo = true;
  commitCount = '2';
  latestTag = null;
  validReferences = new Set(['HEAD', 'h1', 'h2']);
  
  await assert.rejects(
    consume(getCommits({ to: 'non-existent-to' })),
    /La referencia "non-existent-to" no existe/
  );
});

test('getCommits - throws error when --from reference is invalid', async () => {
  isRepo = true;
  commitCount = '2';
  latestTag = null;
  validReferences = new Set(['HEAD', 'h1', 'h2']);
  
  await assert.rejects(
    consume(getCommits({ from: 'non-existent-from' })),
    /La referencia "non-existent-from" no existe/
  );
});

test('getCommits - range query (from and to)', async () => {
  isRepo = true;
  commitCount = '2';
  latestTag = null;
  validReferences = new Set(['HEAD', 'h1', 'h2']);
  capturedSpawnArgs = null;
  spawnExitCode = 0;
  mockStdoutLines = [
    '-----GIT-DOC-COMMIT-----',
    'h2',
    'fix(api): second commit'
  ];

  const commits = await consume(getCommits({ from: 'h1', to: 'h2' }));
  assert.strictEqual(commits.length, 1);
  assert.strictEqual(commits[0].hash, 'h2');
  assert.ok(capturedSpawnArgs.includes('h1..h2'));
});

test('getCommits - automatic tag fallback', async () => {
  isRepo = true;
  commitCount = '3';
  latestTag = 'v1.0.0';
  validReferences = new Set(['HEAD', 'v1.0.0', 'h3']);
  capturedSpawnArgs = null;
  spawnExitCode = 0;
  mockStdoutLines = [
    '-----GIT-DOC-COMMIT-----',
    'h3',
    'feat(ui): third commit'
  ];

  const commits = await consume(getCommits());
  assert.strictEqual(commits.length, 1);
  assert.strictEqual(commits[0].hash, 'h3');
  assert.ok(capturedSpawnArgs.includes('v1.0.0..HEAD'));
});
