import type { ComponentShell } from '../directives'
import { appendStyle, clearChildren } from './dom'
import { installHotkeyForwarder } from './hotkeys'
import { appendObsidianLinks } from './obsidian-css'
import { rehydrateScripts } from './scripts'
import { SHELL_OVERRIDE_CSS, buildShell } from './shell'

// Build the iframe environment for a mockup:
//   - inject theme tokens (CSS variables snapshot from outer document)
//   - inject @font-face rules cloned from outer document.styleSheets
//   - inject user-supplied stylesheet sources (already concatenated CSS)
//   - inject Chart.js bundle (if provided)
//   - parse the mockup HTML via DOMParser, importNode into iframe document
//   - rehydrate <script> elements so user inline scripts execute

export interface IframeBuildOpts {
  body: string
  hostClass?: string
  containerClass?: string
  bodyClasses: string[]
  themeClasses?: string[]
  sourceCss: string
  baseUrl?: string
  chartJsBundle?: string
  chartBootstrap?: string
  themeTokensCss?: string
  fontFacesCss?: string
  obsidianStylesheetUrls?: string[]
  shell?: ComponentShell
}

export function createBlankIframe(): HTMLIFrameElement {
  const iframe = document.createElement('iframe')
  iframe.className = 'mockup-viewer-iframe'
  return iframe
}

export function populateIframe(iframe: HTMLIFrameElement, opts: IframeBuildOpts): void {
  const doc = iframe.contentDocument
  if (!doc) throw new Error('iframe has no contentDocument; appendChild before populate')

  clearChildren(doc.head)
  clearChildren(doc.body)
  doc.body.className = ''

  if (opts.baseUrl) {
    const base = doc.createElement('base')
    base.href = opts.baseUrl
    doc.head.appendChild(base)
  }

  appendStyle(doc, 'theme', opts.themeTokensCss)
  appendStyle(doc, 'fonts', opts.fontFacesCss)
  appendObsidianLinks(doc, opts.obsidianStylesheetUrls)
  appendStyle(doc, 'shell-override', SHELL_OVERRIDE_CSS)
  appendStyle(doc, 'sources', opts.sourceCss)

  if (opts.chartJsBundle) {
    const script = doc.createElement('script')
    script.setAttribute('data-mv', 'chartjs')
    script.textContent = opts.chartJsBundle
    doc.head.appendChild(script)
  }

  opts.themeClasses?.forEach(c => doc.body.classList.add(c))
  opts.bodyClasses.forEach(c => doc.body.classList.add(c))

  const target = buildShell(doc, opts.shell ?? 'view', opts.hostClass, opts.containerClass)
  injectBody(doc, opts.body, target)

  // iframe keydown doesn't bubble to the host; forward modifier combos so
  // Obsidian hotkeys (Cmd+P, etc.) still fire when the iframe has focus.
  installHotkeyForwarder(doc, iframe.ownerDocument)

  if (opts.chartBootstrap) {
    const script = doc.createElement('script')
    script.setAttribute('data-mv', 'chart-bootstrap')
    script.textContent = opts.chartBootstrap
    doc.body.appendChild(script)
  }
}

function injectBody(doc: Document, html: string, target: HTMLElement): void {
  const parser = new DOMParser()
  const parsed = parser.parseFromString(html, 'text/html')
  for (const node of Array.from(parsed.body.childNodes)) {
    target.appendChild(doc.importNode(node, true))
  }
  // Re-create every <script> so the browser actually executes them
  // (DOMParser-built scripts are inert when importNode'd).
  rehydrateScripts(doc, target)
}
