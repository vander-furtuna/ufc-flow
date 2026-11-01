// Empacota o zod num único arquivo ESM para o Plasmo. O Parcel 2.9 do Plasmo
// descarta o módulo que define o z (v4/classic/external.js) ao analisar os
// símbolos de pacotes com "sideEffects": false, e o z chega vazio ao bundle.
// O alias "zod" do package.json aponta para o arquivo gerado aqui.
import { build } from 'esbuild'

await build({
  stdin: {
    contents: "export * from 'zod'\nexport { z, default } from 'zod'\n",
    resolveDir: process.cwd(),
    loader: 'js',
  },
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'chrome120',
  outfile: 'src/vendor/zod.js',
  logLevel: 'warning',
})
