import { CommitParser } from 'conventional-commits-parser';

const sharedParser = new CommitParser();

export function parseCommit(commitMessage) {
  if (!commitMessage) {
    return {
      type: null,
      scope: null,
      subject: null,
      body: null,
      notes: []
    };
  }

  const parsed = sharedParser.parse(commitMessage);

  return {
    type: parsed.type || null,
    scope: parsed.scope || null,
    subject: parsed.subject || null,
    body: parsed.body || null,
    notes: parsed.notes || []
  };
}

