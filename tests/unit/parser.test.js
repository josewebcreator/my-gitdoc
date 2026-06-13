import test from 'node:test';
import assert from 'node:assert';
import { parseCommit } from '../../src/parser.js';

test('parseCommit - standard commit with type, scope and subject', () => {
  const msg = 'feat(auth): add login endpoint';
  const result = parseCommit(msg);
  assert.deepStrictEqual(result, {
    type: 'feat',
    scope: 'auth',
    subject: 'add login endpoint',
    body: null,
    notes: []
  });
});

test('parseCommit - commit with body', () => {
  const msg = 'fix(api): fix user query\n\nThis query had a syntax error in the WHERE clause.';
  const result = parseCommit(msg);
  assert.deepStrictEqual(result, {
    type: 'fix',
    scope: 'api',
    subject: 'fix user query',
    body: 'This query had a syntax error in the WHERE clause.',
    notes: []
  });
});

test('parseCommit - commit with breaking change note', () => {
  const msg = 'refactor(core): update runtime engine\n\nBREAKING CHANGE: Node.js 18 is now required.';
  const result = parseCommit(msg);
  assert.strictEqual(result.type, 'refactor');
  assert.strictEqual(result.scope, 'core');
  assert.strictEqual(result.subject, 'update runtime engine');
  assert.ok(result.notes.length > 0);
  assert.strictEqual(result.notes[0].title, 'BREAKING CHANGE');
  assert.strictEqual(result.notes[0].text, 'Node.js 18 is now required.');
});

test('parseCommit - commit without scope', () => {
  const msg = 'chore: update dependency packages';
  const result = parseCommit(msg);
  assert.deepStrictEqual(result, {
    type: 'chore',
    scope: null,
    subject: 'update dependency packages',
    body: null,
    notes: []
  });
});

test('parseCommit - empty or invalid commit message', () => {
  assert.deepStrictEqual(parseCommit(''), {
    type: null,
    scope: null,
    subject: null,
    body: null,
    notes: []
  });
  assert.deepStrictEqual(parseCommit(null), {
    type: null,
    scope: null,
    subject: null,
    body: null,
    notes: []
  });
});

test('parseCommit - non-conventional commit message', () => {
  const msg = 'just some random commit message here';
  const result = parseCommit(msg);
  assert.deepStrictEqual(result, {
    type: null,
    scope: null,
    subject: null,
    body: null,
    notes: []
  });
});

