import { mock, test } from 'node:test';
import assert from 'node:assert';

// Mock state variables
let isRepo = true;
let commitCount = '2';
let latestTag = null;
let logResult = { all: [] };
let validReferences = new Set();
let capturedLogOptions = null;

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
        },
        log: async (options) => {
          capturedLogOptions = options;
          return logResult;
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
    getCommits(),
    /El directorio actual no es un repositorio Git válido\./
  );
});

test('getCommits - throws error when repository has no commits', async () => {
  isRepo = true;
  commitCount = '0';
  await assert.rejects(
    getCommits(),
    /El repositorio no tiene commits\./
  );
});

test('getCommits - successful extraction of all commits', async () => {
  isRepo = true;
  commitCount = '2';
  latestTag = null;
  validReferences = new Set(['HEAD']);
  capturedLogOptions = null;
  logResult = {
    all: [
      { hash: 'h2', inspectMessage: 'fix(api): second commit\n\nThis is a fix.' },
      { hash: 'h1', inspectMessage: 'feat(core): first commit' }
    ]
  };

  const commits = await getCommits();
  assert.strictEqual(commits.length, 2);
  assert.strictEqual(commits[0].hash, 'h2');
  assert.strictEqual(commits[0].inspectMessage, 'fix(api): second commit\n\nThis is a fix.');
  assert.strictEqual(commits[1].hash, 'h1');
  assert.strictEqual(capturedLogOptions.from, undefined);
  assert.strictEqual(capturedLogOptions.to, undefined);
  assert.strictEqual(capturedLogOptions.HEAD, null);
});

test('getCommits - throws error when --to reference is invalid', async () => {
  isRepo = true;
  commitCount = '2';
  latestTag = null;
  validReferences = new Set(['HEAD', 'h1', 'h2']);
  
  await assert.rejects(
    getCommits({ to: 'non-existent-to' }),
    /La referencia "non-existent-to" no existe/
  );
});

test('getCommits - throws error when --from reference is invalid', async () => {
  isRepo = true;
  commitCount = '2';
  latestTag = null;
  validReferences = new Set(['HEAD', 'h1', 'h2']);
  
  await assert.rejects(
    getCommits({ from: 'non-existent-from' }),
    /La referencia "non-existent-from" no existe/
  );
});

test('getCommits - range query (from and to)', async () => {
  isRepo = true;
  commitCount = '2';
  latestTag = null;
  validReferences = new Set(['HEAD', 'h1', 'h2']);
  capturedLogOptions = null;
  logResult = {
    all: [
      { hash: 'h2', inspectMessage: 'fix(api): second commit' }
    ]
  };

  const commits = await getCommits({ from: 'h1', to: 'h2' });
  assert.strictEqual(commits.length, 1);
  assert.strictEqual(commits[0].hash, 'h2');
  assert.strictEqual(capturedLogOptions.from, 'h1');
  assert.strictEqual(capturedLogOptions.to, 'h2');
});

test('getCommits - automatic tag fallback', async () => {
  isRepo = true;
  commitCount = '3';
  latestTag = 'v1.0.0';
  validReferences = new Set(['HEAD', 'v1.0.0', 'h3']);
  capturedLogOptions = null;
  logResult = {
    all: [
      { hash: 'h3', inspectMessage: 'feat(ui): third commit' }
    ]
  };

  const commits = await getCommits();
  assert.strictEqual(commits.length, 1);
  assert.strictEqual(commits[0].hash, 'h3');
  assert.strictEqual(capturedLogOptions.from, 'v1.0.0');
  assert.strictEqual(capturedLogOptions.to, 'HEAD');
});
