import { test, mock } from 'node:test';
import assert from 'node:assert';

// We mock getCommits to emit 10000 items
mock.module('../../src/git.js', {
  namedExports: {
    getCommits: async function* () {
      for (let i = 0; i < 10000; i++) {
        yield { 
          hash: `hash${i}`, 
          inspectMessage: `feat(core): commit number ${i}\n\nThis is the body of commit ${i}.` 
        };
      }
    }
  }
});

test('Pipeline memory usage with 10000 commits should be under 100 MB', async () => {
  const { runPipeline } = await import('../../src/pipeline.js');

  // Request garbage collection if available (requires --expose-gc, but we just measure anyway)
  if (global.gc) {
    global.gc();
  }

  const startMem = process.memoryUsage().heapUsed;
  
  const parsedCommits = [];
  
  // Consumimos el generador
  for await (const commit of runPipeline('changelog', {})) {
    // Simulamos el mismo filtrado de runGenerate
    if (commit.type !== null && commit.type !== undefined) {
      parsedCommits.push(commit);
    }
  }
  
  // Opcional GC post-procesamiento
  if (global.gc) {
    global.gc();
  }

  const endMem = process.memoryUsage().heapUsed;
  
  // Puede ser que la diferencia sea negativa si GC corrió y liberó más de lo creado, 
  // o positiva. En cualquier caso, el uso total no debe superar lo esperado,
  // pero lo más seguro es verificar que `endMem` o `diff` esté en límites aceptables.
  const diffMB = (endMem - startMem) / 1024 / 1024;
  const totalHeapMB = endMem / 1024 / 1024;

  assert.strictEqual(parsedCommits.length, 10000, 'Deberían haberse procesado 10000 commits válidos');
  
  // El heap usado TOTAL debería ser menor a 100 MB
  // (Incluso sin GC explícito, procesar 10000 strings en vuelo con V8 no debería exceder 100MB)
  assert.ok(
    totalHeapMB < 100, 
    `El consumo de Heap superó los 100 MB. Actual: ${totalHeapMB.toFixed(2)} MB (diff: ${diffMB.toFixed(2)} MB)`
  );
});
