import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Sin include/exclude, vitest recogia tambien dist/**: despues de un
    // `npm run build`, `npm test` ejecutaba cada test dos veces (fuente y copia
    // compilada) y contaba el doble. Los tests viven solo en src/.
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    // Stryker (mutation testing) necesita forks en proceso único: su sandbox
    // instrumenta el codigo y el pool de threads por defecto rompe la
    // correlacion mutacion-test.
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
