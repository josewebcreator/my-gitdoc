import { CommitParser } from 'conventional-commits-parser';

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

  const parser = new CommitParser();
  const parsed = parser.parse(commitMessage);

  return {
    type: parsed.type || null,
    scope: parsed.scope || null,
    subject: parsed.subject || null,
    body: parsed.body || null,
    notes: parsed.notes || []
  };
}

