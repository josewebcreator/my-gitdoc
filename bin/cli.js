#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('tu-doc-cli')
  .description('CLI para generación automática de CHANGELOGs y PAPs basados en commits')
  .version('1.0.0');

program
  .command('generate')
  .argument('<tipo>', 'Tipo de documento a generar (changelog o pap)')
  .option('--desde <tag/commit>', 'Punto de inicio personalizado')
  .option('--scope <nombre>', 'Aísla la documentación a un solo módulo')
  .option('--dry-run', 'Prueba de salida en consola sin modificar archivos físicos')
  .action((tipo, options) => {
    console.log(`Generando ${tipo}...`, options);
  });

program.parse(process.argv);
