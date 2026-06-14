#!/usr/bin/env node

import { Command } from 'commander';
import { runGenerate } from '../src/pipeline.js';

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

program.parse(process.argv);


