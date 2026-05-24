import esbuild from 'esbuild'
import process from 'process'
import console from 'console'
import { exec } from 'child_process'
import { promisify } from 'util'
import { builtinModules as builtins } from 'module'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import fs from 'node:fs'
import { copyFile, mkdir } from 'fs/promises'
import { watch as fsWatch } from 'fs'

const execAsync = promisify(exec)

const banner = `/*
THIS IS A GENERATED/COMPILED FILE AND NOT MEANT TO BE EDITED.
*/
`

const mode = process.argv[2] ?? 'watch'
const prod = mode === 'production'
const watch = mode === 'watch'
const rootDir = dirname(fileURLToPath(import.meta.url))
const outputFile = join(rootDir, 'main.js')
const demoPluginDir = join(rootDir, 'mockup-vault', '.obsidian', 'plugins', 'mockup-viewer')
const watchedAssetNames = new Set(['manifest.json', 'styles.css'])

let syncInFlight = false
let syncQueued = false

async function reloadObsidian() {
  let isRunning = false
  try {
    await execAsync('pgrep -q Obsidian')
    isRunning = true
  } catch {
    // pgrep exit code 1 = not running
  }

  if (!isRunning) {
    exec('open "obsidian://open?vault=mockup-vault"')
    console.log('[dev-sync] Obsidian not running — opened mockup-vault')
    return
  }

  try {
    await execAsync('obsidian plugin:reload id=mockup-viewer vault="mockup-vault"')
    console.log('[dev-sync] Plugin reloaded in Obsidian')
  } catch (err) {
    console.warn('[dev-sync] Reload failed:', err.message?.split('\n')[0])
  }
}

async function syncDemoVault() {
  await mkdir(demoPluginDir, { recursive: true })

  await Promise.all([
    copyFile(outputFile, join(demoPluginDir, 'main.js')),
    copyFile(join(rootDir, 'manifest.json'), join(demoPluginDir, 'manifest.json')),
    copyFile(join(rootDir, 'styles.css'), join(demoPluginDir, 'styles.css')),
  ])

  console.log(`[dev-sync] Synced plugin files to ${demoPluginDir}`)
  if (watch) await reloadObsidian()
}

async function requestSync() {
  if (syncInFlight) {
    syncQueued = true
    return
  }

  syncInFlight = true

  try {
    await syncDemoVault()
  } finally {
    syncInFlight = false

    if (syncQueued) {
      syncQueued = false
      await requestSync()
    }
  }
}

function watchStaticAssets() {
  return fsWatch(rootDir, { persistent: true }, async (_eventType, filename) => {
    const changedFile = filename?.toString()
    if (!changedFile || !watchedAssetNames.has(changedFile)) {
      return
    }

    try {
      await requestSync()
    } catch (error) {
      console.error(`[dev-sync] Failed to sync asset change from ${changedFile}`, error)
    }
  })
}

// Bundled sample mockups — read at build time so they ship inside main.js.
// "Import sample pack" copies these into the user's mockup folder on demand.
// Lives in `samples/` (separate from `mockup-vault/Mockup/` so the dev QA vault
// can be wiped without losing the bundle source).
const exampleDir = join(rootDir, 'samples')
const sampleHello = fs.readFileSync(join(exampleDir, 'hello.html'), 'utf8')
const sampleWithSvg = fs.readFileSync(join(exampleDir, 'with-svg.html'), 'utf8')
const sampleModalDemo = fs.readFileSync(join(exampleDir, 'modal-demo.html'), 'utf8')
const sampleMarkdownViewDemo = fs.readFileSync(join(exampleDir, 'markdown-view-demo.html'), 'utf8')
const sampleSettingsDemo = fs.readFileSync(join(exampleDir, 'settings-demo.html'), 'utf8')
const samplePopoverDemo = fs.readFileSync(join(exampleDir, 'popover-demo.html'), 'utf8')
const sampleSuggestDemo = fs.readFileSync(join(exampleDir, 'suggest-demo.html'), 'utf8')
const sampleInputSuggestDemo = fs.readFileSync(join(exampleDir, 'input-suggest-demo.html'), 'utf8')

// Chart.js + datalabels are injected into the iframe as raw text, so user
// mockups can render <canvas data-chart-config="..."> charts without us
// shipping chart.js into Obsidian's main document.
const chartJsBundle = [
  fs.readFileSync(join(rootDir, 'node_modules/chart.js/dist/chart.umd.min.js'), 'utf8'),
  fs.readFileSync(join(rootDir, 'node_modules/chartjs-plugin-datalabels/dist/chartjs-plugin-datalabels.min.js'), 'utf8'),
  // Register datalabels plugin + sync Chart.defaults.font to iframe body's
  // resolved font-family so chart text matches Obsidian's UI font.
  `\n;(function () {
    if (typeof Chart === 'undefined') return;
    if (typeof ChartDataLabels !== 'undefined') Chart.register(ChartDataLabels);
    try {
      var cs = getComputedStyle(document.body);
      Chart.defaults.font.family = cs.fontFamily || Chart.defaults.font.family;
      Chart.defaults.color = cs.color || Chart.defaults.color;
      // Keep Chart.js default size (12px) — body font (~16px) would make chart
      // labels disproportionately large vs real plugin views.
    } catch (e) { /* ignore */ }
  })();`,
].join('\n')

const context = await esbuild.context({
  banner: { js: banner },
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: [
    'obsidian',
    'electron',
    '@codemirror/autocomplete',
    '@codemirror/collab',
    '@codemirror/commands',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/search',
    '@codemirror/state',
    '@codemirror/view',
    '@lezer/common',
    '@lezer/highlight',
    '@lezer/lr',
    ...builtins,
  ],
  define: {
    '__CHART_JS_BUNDLE__': JSON.stringify(chartJsBundle),
    '__SAMPLE_HELLO__': JSON.stringify(sampleHello),
    '__SAMPLE_WITH_SVG__': JSON.stringify(sampleWithSvg),
    '__SAMPLE_MODAL_DEMO__': JSON.stringify(sampleModalDemo),
    '__SAMPLE_MARKDOWN_VIEW_DEMO__': JSON.stringify(sampleMarkdownViewDemo),
    '__SAMPLE_SETTINGS_DEMO__': JSON.stringify(sampleSettingsDemo),
    '__SAMPLE_POPOVER_DEMO__': JSON.stringify(samplePopoverDemo),
    '__SAMPLE_SUGGEST_DEMO__': JSON.stringify(sampleSuggestDemo),
    '__SAMPLE_INPUT_SUGGEST_DEMO__': JSON.stringify(sampleInputSuggestDemo),
  },
  format: 'cjs',
  target: 'es2018',
  logLevel: 'info',
  minify: prod,
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  outfile: outputFile,
  plugins: [
    {
      name: 'sync-demo-vault',
      setup(build) {
        if (prod) {
          return
        }

        build.onEnd(async (result) => {
          if (result.errors.length > 0) {
            return
          }

          await requestSync()
        })
      },
    },
  ],
})

if (!watch) {
  await context.rebuild()
  process.exit(0)
} else {
  const watcher = watchStaticAssets()
  process.once('exit', () => {
    watcher.close()
  })

  await context.watch()
}
