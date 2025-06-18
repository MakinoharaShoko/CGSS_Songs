import * as esbuild from 'esbuild'
import { sassPlugin } from 'esbuild-sass-plugin'
import * as fs from 'fs/promises'
import * as path from 'path'

const copyFile = async (src: string, dest: string) => {
  try {
    await fs.mkdir(path.dirname(dest), { recursive: true })
    await fs.copyFile(src, dest)
    console.log(`Copied ${src} to ${dest}`)
  } catch (error) {
    console.error(`Failed to copy ${src} to ${dest}:`, error)
  }
}

const isDev = process.argv.includes('--dev')

const build = async () => {
  // Copy database file
  await copyFile(
    './prisma/dev.db',
    './web/out/prisma/dev.db'
  )

  // Copy HTML file
  await copyFile(
    './web/src/index.html',
    './web/out/index.html'
  )

  // Copy sql.js-httpvfs files
  await copyFile(
    './node_modules/sql.js-httpvfs/dist/sqlite.worker.js',
    './web/out/sqlite.worker.js'
  )
  await copyFile(
    './node_modules/sql.js-httpvfs/dist/sql-wasm.wasm',
    './web/out/sql-wasm.wasm'
  )

  const config: esbuild.BuildOptions = {
    entryPoints: ['web/src/index.tsx'],
    bundle: true,
    outdir: 'web/out',
    sourcemap: isDev,
    minify: !isDev,
    target: ['chrome90', 'firefox88', 'safari14', 'edge90'],
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
      servedir: 'web/out',
      port: 8080,
    })
    
    console.log(`Dev server running at http://${host}:${port}`)
  } else {
    await esbuild.build(config)
  }
}

build().catch(console.error) 