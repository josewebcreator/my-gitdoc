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
let mockBranchesRaw = '';
let mockMergeBaseResult = {};

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
          if (args[0] === 'branch') {
            return mockBranchesRaw;
          }
          if (args[0] === 'merge-base') {
            const key = `${args[1]}..${args[2]}`;
            if (mockMergeBaseResult[key] !== undefined) {
              if (mockMergeBaseResult[key] === null) {
                throw new Error('fatal: Not a valid object name');
              }
              return mockMergeBaseResult[key];
            }
            return '';
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
const { getCommits, getAllBranches, getMergeBase, getCommitsDag } = await import('../../src/git.js');

test('getCommits - throws error when directory is not a git repo', async () => {
  isRepo = false;
  await assert.rejects(
    consume(getCommits()),
    /(?:El directorio actual no es un repositorio Git válido|The current directory is not a valid Git repository)\./
  );
});

test('getCommits - throws error when repository has no commits', async () => {
  isRepo = true;
  commitCount = '0';
  await assert.rejects(
    consume(getCommits()),
    /(?:El repositorio no tiene commits|The repository contains no commits)\./
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
    /(?:La referencia "non-existent-to" no existe|The reference "non-existent-to" does not exist)/
  );
});

test('getCommits - throws error when --from reference is invalid', async () => {
  isRepo = true;
  commitCount = '2';
  latestTag = null;
  validReferences = new Set(['HEAD', 'h1', 'h2']);
  
  await assert.rejects(
    consume(getCommits({ from: 'non-existent-from' })),
    /(?:La referencia "non-existent-from" no existe|The reference "non-existent-from" does not exist)/
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

test('getAllBranches - throws error when directory is not a git repo', async () => {
  isRepo = false;
  await assert.rejects(
    getAllBranches(),
    /(?:El directorio actual no es un repositorio Git válido|The current directory is not a valid Git repository)\./
  );
});

test('getAllBranches - parses branches, normalizes names and deduplicates identical remotes', async () => {
  isRepo = true;
  mockBranchesRaw = [
    'refs/heads/main\x00main\x00hash_main\x00*',
    'refs/heads/feature/auth\x00feature/auth\x00hash_auth\x00 ',
    'refs/remotes/origin/main\x00origin/main\x00hash_main\x00 ',
    'refs/remotes/origin/HEAD\x00origin/HEAD\x00hash_main\x00 ',
    'refs/remotes/origin/feature/payments\x00origin/feature/payments\x00hash_payments\x00 '
  ].join('\n');

  const branches = await getAllBranches();
  assert.strictEqual(branches.length, 3);

  const mainBranch = branches.find((b) => b.name === 'main');
  assert.ok(mainBranch);
  assert.strictEqual(mainBranch.targetCommit, 'hash_main');
  assert.strictEqual(mainBranch.isCurrent, true);
  assert.strictEqual(mainBranch.isRemote, false);

  const authBranch = branches.find((b) => b.name === 'feature/auth');
  assert.ok(authBranch);
  assert.strictEqual(authBranch.targetCommit, 'hash_auth');
  assert.strictEqual(authBranch.isCurrent, false);
  assert.strictEqual(authBranch.isRemote, false);

  const paymentsBranch = branches.find((b) => b.name === 'origin/feature/payments');
  assert.ok(paymentsBranch);
  assert.strictEqual(paymentsBranch.targetCommit, 'hash_payments');
  assert.strictEqual(paymentsBranch.isRemote, true);
});

test('getMergeBase - returns common ancestor hash when resolved', async () => {
  isRepo = true;
  mockMergeBaseResult['main..feature/auth'] = 'hash_base_123';

  const base = await getMergeBase('main', 'feature/auth');
  assert.strictEqual(base, 'hash_base_123');
});

test('getMergeBase - returns null when no common ancestor or error', async () => {
  isRepo = true;
  mockMergeBaseResult['main..orphan_branch'] = null;

  const base = await getMergeBase('main', 'orphan_branch');
  assert.strictEqual(base, null);
});

test('getCommitsDag - throws error when directory is not a git repo', async () => {
  isRepo = false;
  await assert.rejects(
    consume(getCommitsDag()),
    /(?:El directorio actual no es un repositorio Git válido|The current directory is not a valid Git repository)\./
  );
});

test('getCommitsDag - parses commit nodes with parents and author information', async () => {
  isRepo = true;
  commitCount = '2';
  capturedSpawnArgs = null;
  spawnExitCode = 0;

  mockStdoutLines = [
    'hash_m\x00hash_p1 hash_p2\x00Carlos Ruiz\x00carlos@corp.com\x001767225600\x00feat(cart): merge feature branch',
    'hash_p1\x00hash_root\x00Ana Gomez\x00ana@corp.com\x001767139200\x00fix(auth): fix token validation'
  ];

  const nodes = await consume(getCommitsDag(['--all']));
  assert.strictEqual(nodes.length, 2);

  const mergeNode = nodes[0];
  assert.strictEqual(mergeNode.hash, 'hash_m');
  assert.deepStrictEqual(mergeNode.parents, ['hash_p1', 'hash_p2']);
  assert.strictEqual(mergeNode.author, 'Carlos Ruiz');
  assert.strictEqual(mergeNode.email, 'carlos@corp.com');
  assert.strictEqual(mergeNode.timestamp, 1767225600);
  assert.strictEqual(mergeNode.subject, 'feat(cart): merge feature branch');
  assert.strictEqual(mergeNode.isMerge, true);

  const regularNode = nodes[1];
  assert.strictEqual(regularNode.hash, 'hash_p1');
  assert.deepStrictEqual(regularNode.parents, ['hash_root']);
  assert.strictEqual(regularNode.isMerge, false);
});

