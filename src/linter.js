import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Loads business rules from a JSON file.
 * @param {string} rulesPath - Absolute or relative path to rules.json
 * @returns {object} Parsed rules object
 */
export function loadRules(rulesPath) {
  const absolutePath = resolve(__dirname, '..', rulesPath);
  const content = readFileSync(absolutePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Validates a single parsed commit against business rules.
 * @param {object} parsedCommit - Commit object from parser.js
 * @param {object} rules - Rules object from loadRules()
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function lintCommit(parsedCommit, rules = {}) {
  const errors = [];
  const { allowedTypes = [], forbiddenTerms = {}, requiredFields = [] } = rules;

  // 1. Validate required fields
  for (const field of requiredFields) {
    if (!parsedCommit[field]) {
      errors.push(`Campo obligatorio faltante: "${field}". El commit debe tener un ${field} definido.`);
    }
  }

  // 2. Validate type belongs to allowedTypes (only if type exists)
  if (parsedCommit.type && allowedTypes.length > 0) {
    if (!allowedTypes.includes(parsedCommit.type)) {
      errors.push(
        `Tipo de commit inválido: "${parsedCommit.type}". Tipos permitidos: ${allowedTypes.join(', ')}.`
      );
    }
  }

  // 3. Lexical filter — case-insensitive search in subject and body
  const fieldsToScan = [parsedCommit.subject, parsedCommit.body].filter(Boolean);
  for (const [term, suggestion] of Object.entries(forbiddenTerms)) {
    const pattern = new RegExp(term, 'i');
    for (const text of fieldsToScan) {
      if (pattern.test(text)) {
        errors.push(
          `El commit contiene el término prohibido "${term}". Sugerencia: use "${suggestion}" en su lugar.`
        );
        break; // One error per forbidden term is enough
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
