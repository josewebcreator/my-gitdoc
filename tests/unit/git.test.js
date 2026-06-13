import test, { before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { simpleGit } from 'simple-git';
import { getCommits } from '../../src/git.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testRoot = path.resolve(__dirname, '../tmp_test_git_repos');
const originalCwd = process.cwd();

before(() => {
  if (fs.existsSync(testRoot)) {
    fs.rmSync(testRoot, { recursive: true, force: true });
  }
  fs.mkdirSync(testRoot, { recursive: true });
});

after(() => {
  process.chdir(originalCwd);
  if (fs.existsSync(testRoot)) {
    try {
      fs.rmSync(testRoot, { recursive: true, force: true });
    } catch (err) {
      // ignore windows lock errors
    }
  }
});

test('getCommits - throws error when directory is not a git repo', async () => {
  const tempDir = path.join(testRoot, 'not-a-repo');
  fs.mkdirSync(tempDir, { recursive: true });
  
  process.env.GIT_CEILING_DIRECTORIES = testRoot;
  process.chdir(tempDir);
  try {
    await assert.rejects(
      getCommits(),
      /El directorio actual no es un repositorio Git válido\./
    );
  } finally {
    delete process.env.GIT_CEILING_DIRECTORIES;
  }
});

test('getCommits - throws error when repository has no commits', async () => {
  const tempDir = path.join(testRoot, 'empty-repo');
  fs.mkdirSync(tempDir, { recursive: true });
  
  const git = simpleGit(tempDir);
  await git.init();
  
  process.chdir(tempDir);
  await assert.rejects(
    getCommits(),
    /El repositorio no tiene commits\./
  );
});

test('getCommits - successful extraction and edge cases', async () => {
  const tempDir = path.join(testRoot, 'valid-repo');
  fs.mkdirSync(tempDir, { recursive: true });
  
  const git = simpleGit(tempDir);
  await git.init();
  
  // configure user for git commits in test repo
  await git.addConfig('user.name', 'QA Agent');
  await git.addConfig('user.email', 'qa@agent.com');

  // commit 1
  fs.writeFileSync(path.join(tempDir, 'file1.txt'), 'hello 1');
  await git.add('file1.txt');
  const commit1Result = await git.commit('feat(core): first commit');
  const hash1 = commit1Result.commit;

  // commit 2
  fs.writeFileSync(path.join(tempDir, 'file2.txt'), 'hello 2');
  await git.add('file2.txt');
  const commit2Result = await git.commit('fix(api): second commit\n\nThis is a fix.');
  const hash2 = commit2Result.commit;

  process.chdir(tempDir);

  // 1. Test get all commits (no from/to, no tags)
  const allCommits = await getCommits();
  assert.strictEqual(allCommits.length, 2);
  assert.strictEqual(allCommits[0].hash, hash2); // newer first by default in git log
  assert.strictEqual(allCommits[1].hash, hash1);
  assert.strictEqual(allCommits[0].inspectMessage.trim(), 'fix(api): second commit\n\nThis is a fix.');

  // 2. Test invalid --to
  await assert.rejects(
    getCommits({ to: 'non-existent-to' }),
    /La referencia "non-existent-to" no existe/
  );

  // 3. Test invalid --from
  await assert.rejects(
    getCommits({ from: 'non-existent-from' }),
    /La referencia "non-existent-from" no existe/
  );

  // 4. Test range query
  const rangeCommits = await getCommits({ from: hash1, to: hash2 });
  // should return commit 2 (from is exclusive in git log range)
  assert.strictEqual(rangeCommits.length, 1);
  assert.strictEqual(rangeCommits[0].hash, hash2);

  // 5. Test automatic tag fallback
  // Add a tag to commit 1
  await git.addTag('v1.0.0');
  
  // commit 3
  fs.writeFileSync(path.join(tempDir, 'file3.txt'), 'hello 3');
  await git.add('file3.txt');
  const commit3Result = await git.commit('feat(ui): third commit');
  const hash3 = commit3Result.commit;

  // Running getCommits with no options should now default from = 'v1.0.0'
  // and return only commits since v1.0.0 (exclusive), which is commit 3
  const tagFallbackCommits = await getCommits();
  assert.strictEqual(tagFallbackCommits.length, 1);
  assert.strictEqual(tagFallbackCommits[0].hash, hash3);
  assert.strictEqual(tagFallbackCommits[0].inspectMessage.trim(), 'feat(ui): third commit');
});
