import { simpleGit } from 'simple-git';

export async function getCommits(options = {}) {
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

  // 4. Query logs with range
  const logOptions = {
    format: {
      hash: '%H',
      inspectMessage: '%B'
    }
  };

  if (from && to) {
    logOptions.from = from;
    logOptions.to = to;
  } else if (from) {
    logOptions.from = from;
    logOptions.to = 'HEAD';
  } else if (to) {
    logOptions[to] = null;
  }

  try {
    const logResult = await git.log(logOptions);
    return logResult.all;
  } catch (err) {
    throw new Error(`Error al obtener el historial de Git: ${err.message}`);
  }
}

