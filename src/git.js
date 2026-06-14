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

  const child = spawn('git', args);
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
