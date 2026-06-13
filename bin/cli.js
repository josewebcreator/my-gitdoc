#!/usr/bin/env node

import { Command } from 'commander';
import pc from 'picocolors';

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
  .action((tipo, options) => {
    const tiposValidos = ['changelog', 'pap'];
    if (!tiposValidos.includes(tipo)) {
      console.error(pc.red(`Error: El tipo de documento "${tipo}" no es válido. Debe ser "changelog" o "pap".`));
      process.exit(1);
    }
    console.log(`Generando ${tipo}...`, options);
  });

program.parse(process.argv);
