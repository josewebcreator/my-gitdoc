import { getCommits } from './git.js';
import { parseCommit } from './parser.js';
import pc from 'picocolors';

export async function runPipeline(tipo, options = {}) {
  const commits = await getCommits(options);
  return commits.map(c => ({
    hash: c.hash,
    ...parseCommit(c.inspectMessage)
  }));
}

export async function runGenerate(tipo, options = {}) {
  const tiposValidos = ['changelog', 'pap'];
  if (!tiposValidos.includes(tipo)) {
    console.error(pc.red(`Error: El tipo de documento "${tipo}" no es válido. Debe ser "changelog" o "pap".`));
    process.exit(1);
  }

  try {
    const parsedCommits = await runPipeline(tipo, options);

    if (options.dryRun) {
      console.log(JSON.stringify(parsedCommits, null, 2));
    } else {
      console.log(`Generando ${tipo}...`);
    }
  } catch (error) {
    console.error(pc.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

