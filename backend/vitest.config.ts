import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Sin include/exclude, vitest recogia tambien dist/**: despues de un
    // `npm run build`, `npm test` ejecutaba cada test dos veces (fuente y copia
    // compilada) y contaba el doble. Los tests viven solo en src/.
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    // El margen por defecto son 5 s y no llega cuando la suite entera corre en
    // paralelo: los tests del asesor de IA esperan a que falle una llamada a un
    // modelo, y con la máquina cargada tardan más en rendirse que en verificar
    // (aislados tardan 2 s). Un margen holgado no tapa ningún fallo, solo deja de
    // confundir «va lento» con «está roto».
    testTimeout: 20000,
  },
});
