import * as esbuild from 'esbuild'
import { sassPlugin } from 'esbuild-sass-plugin'

const isDev = process.argv.includes('--dev')

const config: esbuild.BuildOptions = {
  entryPoints: ['src/index.tsx'],
  bundle: true,
  outdir: 'out',
  sourcemap: isDev,
  minify: !isDev,
  target: ['chrome58', 'firefox57', 'safari11', 'edge16'],
  loader: {
    '.png': 'file',
    '.svg': 'file',
    '.jpg': 'file',
    '.gif': 'file',
  },
  plugins: [
    sassPlugin()
  ],
  define: {
    'process.env.NODE_ENV': isDev ? '"development"' : '"production"'
  }
}

if (isDev) {
  const ctx = await esbuild.context(config)
  await ctx.watch()
  
  const { host, port } = await ctx.serve({
    servedir: 'out',
    port: 3000,
  })
  
  console.log(`Dev server running at http://${host}:${port}`)
} else {
  await esbuild.build(config)
} 