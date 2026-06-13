import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getCommits } from './git.js';
import { parseCommit } from './parser.js';
import { lintCommit, loadRules } from './linter.js';
import { renderDocument } from './renderer.js';
import pc from 'picocolors';

// Output file names indexed by tipo
const OUTPUT_FILES = {
  changelog: 'CHANGELOG.md',
  pap:       'PAP.md',
};

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

    // Render document (applies grouping + Handlebars)
    const scopeFilter = options.scope || undefined;
    const markdown = await renderDocument(parsedCommits, tipo, scopeFilter);

    if (options.dryRun) {
      process.stdout.write(pc.yellow('⚠  Modo simulación (--dry-run): no se escribirán archivos físicos.\n\n'));
      process.stdout.write(markdown);
    } else {
      const outputPath = resolve(process.cwd(), OUTPUT_FILES[tipo]);
      await writeFile(outputPath, markdown, 'utf-8');
      console.log(pc.green(`✅ Documento generado: ${OUTPUT_FILES[tipo]}`));
    }
  } catch (error) {
    console.error(pc.red(`Error: ${error.message}`));
    process.exit(1);
  }
}
