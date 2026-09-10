#!/usr/bin/env node

import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { Command, Help } from 'commander';
import { runGenerate } from '../src/pipeline.js';
import { runWizardInit, runWizardGenerate } from '../src/wizard.js';
import { select } from '@inquirer/prompts';
import { t, initI18n } from '../src/i18n/index.js';
import pc from 'picocolors';
import { extractTopology } from '../src/graph/topology.js';
import { analyzeCollaborators } from '../src/graph/collaborators.js';

// Pre-parsear -l o --lang de process.argv antes de configurar Commander
let cliLang;
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '-l' || process.argv[i] === '--lang') {
    cliLang = process.argv[i + 1];
    break;
  }
  if (process.argv[i].startsWith('--lang=')) {
    cliLang = process.argv[i].split('=')[1];
    break;
  }
}

// Cargar .gitdocrc.json si existe para leer locale e i18n
let localConfig = {};
const localConfigPath = resolve(process.cwd(), '.gitdocrc.json');
if (existsSync(localConfigPath)) {
  try {
    localConfig = JSON.parse(readFileSync(localConfigPath, 'utf-8'));
  } catch {}
}

// Inicializar i18n inmediatamente con la jerarquía completa
initI18n({
  lang: cliLang,
  configLocale: localConfig.locale,
  customCatalogs: localConfig.i18n,
});

const program = new Command();

program
  .name('tu-doc-cli')
  .description(t('cli.description'))
  .version('1.0.0', '-V, --version', t('cli.versionOption'))
  .helpOption('-h, --help', t('cli.helpOption'))
  .helpCommand(t('cli.helpCommandTerm'), t('cli.helpCommand'))
  .option(t('cli.langFlag'), t('cli.langOption'));

program.configureHelp({
  styleTitle: (title) => {
    const map = {
      'Usage:': t('cli.headings.usage'),
      'Arguments:': t('cli.headings.arguments'),
      'Options:': t('cli.headings.options'),
      'Commands:': t('cli.headings.commands'),
    };
    return map[title] || title;
  },
  subcommandTerm: function (cmd) {
    const term = Help.prototype.subcommandTerm.call(this, cmd);
    return term.replace('[options]', t('cli.terms.options'));
  },
  commandUsage: function (cmd) {
    const term = Help.prototype.commandUsage.call(this, cmd);
    return term
      .replace('[options]', t('cli.terms.options'))
      .replace('[command]', t('cli.terms.command'));
  },
});

program
  .command('generate')
  .description(t('cli.generate.description'))
  .argument(t('cli.generate.argumentType'), t('cli.generate.argumentTipo'))
  .option(t('cli.langFlag'), t('cli.langOption'))
  .option('--from <tag/commit/hash>', t('cli.generate.from'))
  .option('--to <tag/commit/hash>', t('cli.generate.to'))
  .option(t('cli.generate.scopeFlag'), t('cli.generate.scope'))
  .option('--dry-run', t('cli.generate.dryRun'))
  .option(t('cli.generate.outputFlag'), t('cli.generate.output'))
  .option(t('cli.generate.templateFlag'), t('cli.generate.template'))
  .option('-v, --verbose', t('cli.generate.verbose'))
  .action((tipo, options, cmd) => {
    const mergedOpts = { ...cmd.optsWithGlobals(), ...options };
    return runGenerate(tipo, mergedOpts);
  });

// ---------------------------------------------------------------------------
// Topology / Graph command
// ---------------------------------------------------------------------------

program
  .command('topology')
  .alias('graph')
  .description(t('cli.topology.description'))
  .option(t('cli.langFlag'), t('cli.langOption'))
  .option(t('cli.topology.branchFlag'), t('cli.topology.branch'))
  .option(t('cli.topology.authorFlag'), t('cli.topology.author'))
  .option(t('cli.topology.sinceFlag'), t('cli.topology.since'))
  .option(t('cli.topology.untilFlag'), t('cli.topology.until'))
  .option(t('cli.topology.fromFlag'), t('cli.topology.from'))
  .option(t('cli.topology.toFlag'), t('cli.topology.to'))
  .option('--json', t('cli.topology.json'))
  .action(async (options, cmd) => {
    const mergedOpts = { ...(cmd.optsWithGlobals ? cmd.optsWithGlobals() : {}), ...options };
    if (mergedOpts.lang) {
      initI18n({ lang: mergedOpts.lang });
    }
    try {
      const topo = await extractTopology(mergedOpts);
      const metrics = analyzeCollaborators(topo, mergedOpts);

      if (mergedOpts.json) {
        console.log(JSON.stringify({ topology: topo, collaborators: metrics }, null, 2));
        return;
      }

      console.log(`\n${pc.bold(pc.cyan(t('cli.topology.header')))}`);
      console.log(`${pc.bold(t('cli.topology.baseBranch'))} ${pc.green(topo.baseBranch)}`);
      console.log(
        `${pc.bold(t('cli.topology.totalBranches'))} ${topo.summary.totalBranches} (${pc.green(
          t('cli.topology.activeCount', { count: topo.summary.activeBranches })
        )}, ${pc.blue(
          t('cli.topology.mergedCount', { count: topo.summary.mergedBranches })
        )}, ${pc.yellow(
          t('cli.topology.divergedCount', { count: topo.summary.divergedBranches })
        )})\n`
      );

      console.log(pc.bold(t('cli.topology.branchesHeading')));
      for (const b of topo.branches) {
        let statusBadge = pc.green(t('cli.topology.statusActive'));
        if (b.status === 'merged') statusBadge = pc.blue(t('cli.topology.statusMerged'));
        if (b.status === 'diverged') statusBadge = pc.yellow(t('cli.topology.statusDiverged'));

        const forkStr = b.forkPoint
          ? t('cli.topology.forkedAt', { hash: pc.dim(b.forkPoint.substring(0, 7)) })
          : '';
        const mergeStr = b.mergeCommit
          ? t('cli.topology.mergedIn', { hash: pc.dim(b.mergeCommit.substring(0, 7)) })
          : '';
        const isCurrentStr = b.isCurrent ? pc.cyan(' *') : '';

        console.log(
          `  ${pc.bold(b.name)}${isCurrentStr} ${statusBadge}${forkStr}${mergeStr} — ${t(
            'cli.topology.commitsCount',
            { count: b.commits.length }
          )}`
        );
      }

      console.log(`\n${pc.bold(t('cli.topology.collaboratorsHeading'))}`);
      for (const col of metrics.global) {
        const typesStr = Object.entries(col.types)
          .map(([k, v]) => `${k}:${v}`)
          .join(', ');
        const scopesStr = col.scopes.length > 0 ? col.scopes.join(', ') : t('cli.topology.generalScope');
        console.log(
          `  • ${pc.bold(col.name)} ${pc.dim(`<${col.email}>`)}: ${pc.cyan(
            t('cli.topology.commitsCount', { count: col.commitsCount })
          )}`
        );
        if (typesStr) console.log(`    ${pc.dim(t('cli.topology.typesLabel'))} ${typesStr}`);
        console.log(`    ${pc.dim(t('cli.topology.scopesLabel'))} ${scopesStr}`);
        if (col.branches.length > 0)
          console.log(`    ${pc.dim(t('cli.topology.branchesLabel'))} ${col.branches.join(', ')}`);
      }
      console.log('');
    } catch (err) {
      console.error(pc.red(`\n✖ Error: ${err.message}\n`));
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// Wizard command
// ---------------------------------------------------------------------------

const wizard = program
  .command('wizard')
  .description(t('cli.wizard.description'))
  .option(t('cli.langFlag'), t('cli.langOption'));

wizard
  .command('init')
  .description(t('cli.wizard.init'))
  .option(t('cli.langFlag'), t('cli.langOption'))
  .action(async (_options, cmd) => {
    const opts = cmd.optsWithGlobals ? cmd.optsWithGlobals() : {};
    await runWizardInit({}, opts);
  });

wizard
  .command('generate')
  .description(t('cli.wizard.generate'))
  .option(t('cli.langFlag'), t('cli.langOption'))
  .action(async (_options, cmd) => {
    const opts = cmd.optsWithGlobals ? cmd.optsWithGlobals() : {};
    await runWizardGenerate({}, opts);
  });

// Si se invoca `wizard` sin subcomando, preguntar cuál flujo iniciar
wizard.action(async (_options, cmd) => {
  const opts = cmd.optsWithGlobals ? cmd.optsWithGlobals() : {};
  if (opts.lang) {
    initI18n({ lang: opts.lang });
  }
  const flow = await select({
    message: t('wizard.main.prompt'),
    choices: [
      { name: t('wizard.main.initChoice'), value: 'init' },
      { name: t('wizard.main.generateChoice'), value: 'generate' },
    ],
  });
  if (flow === 'init') {
    await runWizardInit({}, opts);
  } else {
    await runWizardGenerate({}, opts);
  }
});

program.parse(process.argv);
