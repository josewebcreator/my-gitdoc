import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { getCommits } from './git.js';
import { parseCommit } from './parser.js';
import { lintCommit, loadRules, deepMerge } from './linter.js';
import { renderDocument } from './renderer.js';
import pc from 'picocolors';

// Output file names indexed by tipo
const OUTPUT_FILES = {
  changelog: 'CHANGELOG.md',
  pap:       'PAP.md',
};

export async function* runPipeline(tipo, options = {}, rules = {}) {
  for await (const c of getCommits(options)) {
    yield {
      hash: c.hash,
      ...parseCommit(c.inspectMessage)
    };
  }
}

export async function runGenerate(tipo, options = {}) {
  const tiposValidos = ['changelog', 'pap'];
  if (!tiposValidos.includes(tipo)) {
    console.error(pc.red(`Error: El tipo de documento "${tipo}" no es válido. Debe ser "changelog" o "pap".`));
    process.exit(1);
  }

  try {
    // Load business rules once
    let rules = loadRules('config/rules.json');

    // Load local config .gitdocrc.json if present
    const localConfigPath = resolve(process.cwd(), '.gitdocrc.json');
    if (existsSync(localConfigPath)) {
      try {
        const localConfigContent = readFileSync(localConfigPath, 'utf-8');
        const localRules = JSON.parse(localConfigContent);
        rules = deepMerge(rules, localRules);
      } catch (err) {
        console.error(pc.red(`Error al cargar el archivo de configuración .gitdocrc.json: ${err.message}`));
        process.exit(1);
      }
    }

    const parsedCommits = [];
    const lintErrors = [];

    for await (const commit of runPipeline(tipo, options, rules)) {
      if (commit.type === null || commit.type === undefined) continue;
      
      const result = lintCommit(commit, rules);
      if (!result.valid) {
        lintErrors.push({ commit, errors: result.errors });
      }
      
      parsedCommits.push(commit);
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
    const markdown = await renderDocument(parsedCommits, tipo, {
      scope: options.scope || undefined,
      template: options.template || undefined,
      verbose: options.verbose || false,
      remoteUrl: rules.remoteUrl || undefined,
    });

    if (options.dryRun) {
      process.stdout.write(pc.yellow('⚠  Modo simulación (--dry-run): no se escribirán archivos físicos.\n\n'));
      process.stdout.write(markdown);
    } else {
      const outputPath = resolve(process.cwd(), options.output || OUTPUT_FILES[tipo]);
      const outputDir = dirname(outputPath);
      await mkdir(outputDir, { recursive: true });
      await writeFile(outputPath, markdown, 'utf-8');
      console.log(pc.green(`✅ Documento generado: ${options.output || OUTPUT_FILES[tipo]}`));
    }
  } catch (error) {
    console.error(pc.red(`Error: ${error.message}`));
    process.exit(1);
  }
}
