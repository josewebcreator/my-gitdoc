import { simpleGit } from 'simple-git';
import { spawn } from 'node:child_process';
import readline from 'node:readline';

export async function* getCommits(options = {}) {
  const git = simpleGit();

  // 1. Validate repository presence
  let isRepo = false;
  try {
    isRepo = await git.checkIsRepo();
  } catch (err) {
    isRepo = false;
  }
  if (!isRepo) {
    throw new Error('El directorio actual no es un repositorio Git válido.');
  }

  // 2. Validate that there are commits in the repository
  let hasCommits = false;
  try {
    const count = await git.raw(['rev-list', '--all', '--count']);
    if (parseInt(count.trim(), 10) > 0) {
      hasCommits = true;
    }
  } catch (err) {
    // If command fails, assume no commits/HEAD
  }
  if (!hasCommits) {
    throw new Error('El repositorio no tiene commits.');
  }

  let { from, to } = options;

  // Validate to if provided
  if (to) {
    let toExists = false;
    try {
      await git.revparse(['--verify', to]);
      toExists = true;
    } catch (err) {
      toExists = false;
    }
    if (!toExists) {
      throw new Error(`La referencia "${to}" no existe en el historial del repositorio.`);
    }
  } else {
    to = 'HEAD';
  }

  // If from is not provided, detect the latest tag
  if (!from) {
    try {
      const tags = await git.tags();
      if (tags.latest) {
        from = tags.latest;
      }
    } catch (err) {
      // Ignore tag error, default to all history
    }
  }

  // Validate from if resolved/provided
  if (from) {
    let fromExists = false;
    try {
      await git.revparse(['--verify', from]);
      fromExists = true;
    } catch (err) {
      fromExists = false;
    }
    if (!fromExists) {
      throw new Error(`La referencia "${from}" no existe en el historial del repositorio.`);
    }
  }

  // 4. Query logs with range using spawn
  const args = ['log', '--format=-----GIT-DOC-COMMIT-----%n%H%n%B'];

  if (from && to) {
    args.push(`${from}..${to}`);
  } else if (from) {
    args.push(`${from}..HEAD`);
  } else if (to) {
    args.push(to);
  }

  const spawnOptions = options.cwd ? { cwd: options.cwd } : undefined;
  const child = spawn('git', args, spawnOptions);
  const rl = readline.createInterface({ input: child.stdout });

  let currentHash = null;
  let currentMessage = [];

  for await (const line of rl) {
    if (line === '-----GIT-DOC-COMMIT-----') {
      if (currentHash) {
        yield { hash: currentHash, inspectMessage: currentMessage.join('\n').trim() };
      }
      currentHash = null;
      currentMessage = [];
    } else if (!currentHash) {
      currentHash = line;
    } else {
      currentMessage.push(line);
    }
  }

  if (currentHash) {
    yield { hash: currentHash, inspectMessage: currentMessage.join('\n').trim() };
  }

  await new Promise((resolve, reject) => {
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Error al obtener el historial de Git: git log finalizó con código ${code}`));
      } else {
        resolve();
      }
    });
    child.on('error', (err) => {
      reject(new Error(`Error al obtener el historial de Git: ${err.message}`));
    });
  });
}

export async function getAllBranches(options = {}) {
  const git = simpleGit(options.cwd);

  let isRepo = false;
  try {
    isRepo = await git.checkIsRepo();
  } catch {
    isRepo = false;
  }
  if (!isRepo) {
    throw new Error('El directorio actual no es un repositorio Git válido.');
  }

  const args = ['branch'];
  if (options.all !== false) {
    args.push('-a');
  }
  args.push('--format=%(refname)%00%(refname:short)%00%(objectname)%00%(HEAD)');

  let rawOutput = '';
  try {
    rawOutput = await git.raw(args);
  } catch {
    return [];
  }

  const lines = rawOutput.split('\n').map((l) => l.trim()).filter(Boolean);
  const localBranches = new Map();
  const remoteBranches = [];

  for (const line of lines) {
    const parts = line.split('\0');
    if (parts.length < 3) continue;
    const [fullRef, shortRef, objectName, headMark] = parts;
    const targetCommit = objectName ? objectName.trim() : '';
    const isCurrent = (headMark || '').trim() === '*';

    // Omitir referencias simbólicas HEAD
    if (fullRef.endsWith('/HEAD') || shortRef.endsWith('/HEAD')) {
      continue;
    }

    if (fullRef.startsWith('refs/heads/')) {
      localBranches.set(shortRef, {
        name: shortRef,
        targetCommit,
        isCurrent,
        isRemote: false,
      });
    } else if (fullRef.startsWith('refs/remotes/')) {
      remoteBranches.push({
        fullRef,
        shortRef,
        targetCommit,
        isCurrent,
      });
    } else {
      localBranches.set(shortRef, {
        name: shortRef,
        targetCommit,
        isCurrent,
        isRemote: false,
      });
    }
  }

  const results = Array.from(localBranches.values());

  for (const remote of remoteBranches) {
    const slashIdx = remote.shortRef.indexOf('/');
    const remoteBranchName = slashIdx !== -1 ? remote.shortRef.slice(slashIdx + 1) : remote.shortRef;

    const localMatch = localBranches.get(remoteBranchName);
    if (localMatch && localMatch.targetCommit === remote.targetCommit) {
      // Referencia idéntica a la rama local, evitar duplicación
      continue;
    }

    results.push({
      name: remote.shortRef,
      targetCommit: remote.targetCommit,
      isCurrent: remote.isCurrent,
      isRemote: true,
    });
  }

  return results;
}

export async function getMergeBase(refA, refB, options = {}) {
  const git = simpleGit(options.cwd);
  try {
    const output = await git.raw(['merge-base', refA, refB]);
    const trimmed = (output || '').trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

export async function* getCommitsDag(refs = ['--all'], options = {}) {
  const git = simpleGit(options.cwd);

  let isRepo = false;
  try {
    isRepo = await git.checkIsRepo();
  } catch {
    isRepo = false;
  }
  if (!isRepo) {
    throw new Error('El directorio actual no es un repositorio Git válido.');
  }

  let hasCommits = false;
  try {
    const count = await git.raw(['rev-list', '--all', '--count']);
    if (parseInt(count.trim(), 10) > 0) {
      hasCommits = true;
    }
  } catch {
    // Si falla rev-list, comprobar si tiene commits
  }
  if (!hasCommits) {
    throw new Error('El repositorio no tiene commits.');
  }

  const args = ['log', '--format=%H%x00%P%x00%an%x00%ae%x00%at%x00%s'];

  if (Array.isArray(refs) && refs.length > 0) {
    args.push(...refs);
  } else if (typeof refs === 'string' && refs.trim().length > 0) {
    args.push(refs.trim());
  } else {
    args.push('--all');
  }

  if (options.since) {
    args.push(`--since=${options.since}`);
  }
  if (options.until) {
    args.push(`--until=${options.until}`);
  }
  if (options.author) {
    args.push(`--author=${options.author}`);
  }

  const spawnOptions = options.cwd ? { cwd: options.cwd } : undefined;
  const child = spawn('git', args, spawnOptions);
  const rl = readline.createInterface({ input: child.stdout });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes('\0')) {
      continue;
    }

    const [hash, parentsRaw, author, email, timestamp, ...subjectParts] = trimmed.split('\0');
    if (!hash) continue;

    const parents = parentsRaw ? parentsRaw.trim().split(/\s+/).filter(Boolean) : [];
    const ts = parseInt(timestamp, 10);

    yield {
      hash,
      parents,
      author: author || '',
      email: email || '',
      timestamp: isNaN(ts) ? 0 : ts,
      date: isNaN(ts) ? new Date(0) : new Date(ts * 1000),
      subject: subjectParts.join('\0') || '',
      isMerge: parents.length > 1,
    };
  }

  await new Promise((resolve, reject) => {
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Error al obtener el grafo de Git: git log finalizó con código ${code}`));
      } else {
        resolve();
      }
    });
    child.on('error', (err) => {
      reject(new Error(`Error al obtener el grafo de Git: ${err.message}`));
    });
  });
}

