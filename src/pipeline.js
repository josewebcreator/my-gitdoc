import { getCommits } from './git.js';
import { parseCommit } from './parser.js';
import { lintCommit, loadRules } from './linter.js';
import pc from 'picocolors';

export async function runPipeline(tipo, options = {}, rules = {}) {
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
    // Load business rules once
    const rules = loadRules('config/rules.json');

    const parsedCommits = await runPipeline(tipo, options, rules);

    // Run linter on every parsed commit
    const lintErrors = [];
    for (const commit of parsedCommits) {
      const result = lintCommit(commit, rules);
      if (!result.valid) {
        lintErrors.push({ commit, errors: result.errors });
      }
    }

    if (lintErrors.length > 0) {
      console.error(pc.red('❌ El linter de negocio encontró commits inválidos:\n'));
      for (const { commit, errors } of lintErrors) {
        console.error(pc.red(`  Commit: ${commit.hash || '(sin hash)'} — ${commit.type}(${commit.scope}): ${commit.subject}`));
        for (const err of errors) {
          console.error(pc.red(`    → ${err}`));
        }
      }
      process.exit(1);
    }

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
