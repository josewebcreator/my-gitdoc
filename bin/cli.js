#!/usr/bin/env node

import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { Command, Help } from 'commander';
import { runGenerate } from '../src/pipeline.js';
import { runWizardInit, runWizardGenerate } from '../src/wizard.js';
import { select } from '@inquirer/prompts';
import { t, initI18n } from '../src/i18n/index.js';

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
