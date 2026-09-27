import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Sin include/exclude, vitest recogia tambien dist/**: despues de un
    // `npm run build`, `npm test` ejecutaba cada test dos veces (fuente y copia
    // compilada) y contaba el doble. Los tests viven solo en src/.
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    // Stryker (mutation testing) necesita correlacionar cada mutacion con el
    // test que la mata: los ficheros se ejecutan de uno en uno, sin paralelismo
    // entre ellos. `poolOptions.forks.singleFork` ya no existe en Vitest 5 (solo
    // imprimia un aviso de deprecacion y se ignoraba), el equivalente actual es
    // `fileParallelism: false`. Cuesta unos segundos mas por pasada.
    pool: 'forks',
    fileParallelism: false,
  },
});
