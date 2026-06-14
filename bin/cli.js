#!/usr/bin/env node

import { Command } from 'commander';
import { runGenerate } from '../src/pipeline.js';
import { runWizardInit, runWizardGenerate } from '../src/wizard.js';
import { select } from '@inquirer/prompts';

const program = new Command();

program
  .name('tu-doc-cli')
  .description('CLI para generación automática de CHANGELOGs y PAPs basados en commits')
  .version('1.0.0');

program
  .command('generate')
  .argument('<tipo>', 'Tipo de documento a generar (changelog o pap)')
  .option('--from <tag/commit/hash>', 'Starting tag, commit hash, or branch')
  .option('--to <tag/commit/hash>', 'Ending tag, commit hash, or branch')
  .option('--scope <nombre>', 'Isolate documentation to a single module')
  .option('--dry-run', 'Test output in console without modifying physical files')
  .option('-o, --output <ruta>', 'Ruta de salida del archivo generado')
  .option('-t, --template <ruta>', 'Ruta de plantilla Handlebars (.hbs)')
  .option('-v, --verbose', 'Activar modo verboso')
  .action(runGenerate);

// ---------------------------------------------------------------------------
// Wizard command
// ---------------------------------------------------------------------------

const wizard = program.command('wizard').description('Asistente interactivo de configuración y generación de documentación');

wizard
  .command('init')
  .description('Crear o actualizar el archivo de configuración .gitdocrc.json de forma interactiva')
  .action(async () => {
    await runWizardInit();
  });

wizard
  .command('generate')
  .description('Guía interactiva para compilar un reporte CHANGELOG o PAP')
  .action(async () => {
    await runWizardGenerate();
  });

// Si se invoca `wizard` sin subcomando, preguntar cuál flujo iniciar
wizard.action(async () => {
  const flow = await select({
    message: '¿Qué deseas hacer?',
    choices: [
      { name: 'Inicializar / actualizar configuración (.gitdocrc.json)', value: 'init' },
      { name: 'Generar un reporte de documentación (CHANGELOG / PAP)', value: 'generate' },
    ],
  });
  if (flow === 'init') {
    await runWizardInit();
  } else {
    await runWizardGenerate();
  }
});

program.parse(process.argv);


