import test from 'node:test';
import assert from 'node:assert';
import { lintCommit, deepMerge } from '../../src/linter.js';

// Default rules matching config/rules.json structure
const rules = {
  allowedTypes: ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'],
  requiredFields: ['type', 'subject'],
  forbiddenTerms: {
    'fraude': 'riesgoso',
    'hack': 'solución temporal documentada',
    'error estúpido': 'corrección de flujo',
    'temporal': 'ajuste de diseño',
  },
};

test('lintCommit - commit válido completo', () => {
  const result = lintCommit({ type: 'feat', scope: 'auth', subject: 'add login endpoint', body: null, notes: [] }, rules);
  assert.deepStrictEqual(result, { valid: true, errors: [] });
});

test('lintCommit - falta el campo type (null)', () => {
  const result = lintCommit({ type: null, scope: null, subject: 'something', body: null, notes: [] }, rules);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('"type"')), 'Debe reportar campo type faltante');
});

test('lintCommit - falta el campo subject (null)', () => {
  const result = lintCommit({ type: 'feat', scope: null, subject: null, body: null, notes: [] }, rules);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('"subject"')), 'Debe reportar campo subject faltante');
});

test('lintCommit - type no pertenece a allowedTypes', () => {
  const result = lintCommit({ type: 'random', scope: null, subject: 'do something', body: null, notes: [] }, rules);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('"random"')), 'Debe reportar tipo inválido');
});

test('lintCommit - término prohibido "fraude" en subject', () => {
  const result = lintCommit({ type: 'fix', scope: null, subject: 'fix fraude issue in auth', body: null, notes: [] }, rules);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('fraude') && e.includes('riesgoso')), 'Debe sugerir "riesgoso"');
});

test('lintCommit - término prohibido "hack" en body', () => {
  const result = lintCommit({ type: 'fix', scope: null, subject: 'fix login flow', body: 'used a hack to bypass validation', notes: [] }, rules);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('hack')), 'Debe detectar "hack" en body');
});

test('lintCommit - término prohibido en mayúsculas (case-insensitive)', () => {
  const result = lintCommit({ type: 'fix', scope: null, subject: 'HACK applied to session', body: null, notes: [] }, rules);
  assert.strictEqual(result.valid, false, 'Debe ser inválido aunque el término esté en mayúsculas');
});

test('lintCommit - múltiples errores simultáneos', () => {
  const result = lintCommit({ type: null, scope: null, subject: null, body: null, notes: [] }, rules);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.length >= 2, 'Debe reportar al menos 2 errores (type y subject faltantes)');
});

test('deepMerge - mezcla recursiva correcta de reglas de configuración', () => {
  const baseRules = {
    allowedTypes: ['feat', 'fix'],
    requiredFields: ['type'],
    forbiddenTerms: {
      'fraude': 'riesgoso',
      'hack': 'mitigación'
    }
  };

  const customRules = {
    allowedTypes: ['feat', 'fix', 'docs'],
    forbiddenTerms: {
      'hack': 'seguridad',
      'temporal': 'ajuste'
    }
  };

  const merged = deepMerge(baseRules, customRules);

  assert.deepStrictEqual(merged.allowedTypes, ['feat', 'fix', 'docs'], 'Debe sobrescribir arreglos');
  assert.deepStrictEqual(merged.requiredFields, ['type'], 'Debe mantener propiedades base que no se sobrescriben');
  assert.strictEqual(merged.forbiddenTerms.fraude, 'riesgoso', 'Debe mantener claves de diccionario base');
  assert.strictEqual(merged.forbiddenTerms.hack, 'seguridad', 'Debe sobrescribir claves de diccionario existentes');
  assert.strictEqual(merged.forbiddenTerms.temporal, 'ajuste', 'Debe agregar nuevas claves al diccionario');
});
