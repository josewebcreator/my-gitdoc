import test from 'node:test';
import assert from 'node:assert';
import { exec } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.resolve(__dirname, '../../bin/cli.js');
const projectRoot = path.resolve(__dirname, '../..');

function runCli(args, cwd = null) {
  return new Promise((resolve) => {
    const options = {};
    if (cwd) {
      options.cwd = cwd;
      options.env = {
        ...process.env,
        GIT_CEILING_DIRECTORIES: path.dirname(cwd),
      };
    }
    exec(`node "${cliPath}" ${args}`, options, (error, stdout, stderr) => {
      resolve({ code: error ? error.code : 0, stdout, stderr, error });
    });
  });
}

test('CLI Topology - generates GRAPH.html when --html is passed', async () => {
  const defaultHtmlPath = path.resolve(projectRoot, 'GRAPH.html');
  if (fs.existsSync(defaultHtmlPath)) {
    fs.unlinkSync(defaultHtmlPath);
  }

  try {
    const { code, stdout } = await runCli('topology --html');
    assert.strictEqual(code, 0);
    assert.ok(fs.existsSync(defaultHtmlPath), 'Debe haberse generado GRAPH.html');

    const content = fs.readFileSync(defaultHtmlPath, 'utf-8');
    assert.ok(content.startsWith('<!DOCTYPE html>'), 'Debe ser un archivo HTML válido');
    assert.ok(content.includes('<script id="gitdoc-data" type="application/json">'), 'Debe tener datos incrustados');
  } finally {
    if (fs.existsSync(defaultHtmlPath)) {
      fs.unlinkSync(defaultHtmlPath);
    }
  }
});

test('CLI Graph alias - generates custom html path when --html and -o are passed', async () => {
  const customHtmlPath = path.resolve(projectRoot, 'scratch/test-viewer.html');
  if (fs.existsSync(customHtmlPath)) {
    fs.unlinkSync(customHtmlPath);
  }

  try {
    const { code, stdout } = await runCli('graph --html -o scratch/test-viewer.html');
    assert.strictEqual(code, 0);
    assert.ok(fs.existsSync(customHtmlPath), 'Debe haberse generado scratch/test-viewer.html');

    const content = fs.readFileSync(customHtmlPath, 'utf-8');
    assert.ok(content.includes('<title>Gitdoc — Repository Graph & Topology</title>'));
  } finally {
    if (fs.existsSync(customHtmlPath)) {
      fs.unlinkSync(customHtmlPath);
    }
  }
});

test('CLI Generate Graph - supports --html to generate GRAPH.html while keeping default GRAPH.md behavior', async () => {
  const htmlPath = path.resolve(projectRoot, 'GRAPH.html');
  const mdPath = path.resolve(projectRoot, 'GRAPH.md');

  if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
  if (fs.existsSync(mdPath)) fs.unlinkSync(mdPath);

  try {
    // 1. Probar generación por defecto (debe seguir generando Markdown GRAPH.md)
    const resMd = await runCli('generate graph');
    assert.strictEqual(resMd.code, 0);
    assert.ok(fs.existsSync(mdPath), 'generate graph sin --html debe generar GRAPH.md');

    const mdContent = fs.readFileSync(mdPath, 'utf-8');
    assert.ok(mdContent.includes('```mermaid'), 'GRAPH.md debe contener diagramas Mermaid');

    // 2. Probar generación con --html (debe generar GRAPH.html)
    const resHtml = await runCli('generate graph --html');
    assert.strictEqual(resHtml.code, 0);
    assert.ok(fs.existsSync(htmlPath), 'generate graph --html debe generar GRAPH.html');

    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    assert.ok(htmlContent.startsWith('<!DOCTYPE html>'), 'GRAPH.html debe ser HTML válido');
  } finally {
    if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
    if (fs.existsSync(mdPath)) fs.unlinkSync(mdPath);
  }
});
