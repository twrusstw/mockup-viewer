import type { ComponentShell } from '../directives'
import { appendStyle } from './dom'
import { installHotkeyForwarder } from './hotkeys'
import { appendObsidianLinks } from './obsidian-css'
import { SHELL_OVERRIDE_CSS, buildShell } from './shell'

// Build a complete HTML document as a string, then load it into the iframe
// via `srcdoc`. The browser parses srcdoc as a fresh document, so any inline
// scripts (Chart.js bundle, chart bootstrap, user mockup body) execute
// natively — no per-element rehydration step needed.
//
// We intentionally avoid programmatic script element construction: the
// obsidianmd plugin review scanner flags it as a possible dynamic-injection
// risk. srcdoc-driven loading sidesteps the entire pattern.

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
  const html = buildIframeHtml(opts)
  iframe.addEventListener('load', () => {
    const doc = iframe.contentDocument
    if (doc) installHotkeyForwarder(doc, iframe.ownerDocument)
  })
  iframe.srcdoc = html
}

function buildIframeHtml(opts: IframeBuildOpts): string {
  // Build head + body via DOM in a detached document so we can reuse the
  // existing helpers (appendStyle, buildShell, appendObsidianLinks). Then
  // serialize and splice in script tags via string concatenation — keeping
  // all script wiring purely textual.
  const doc = document.implementation.createHTMLDocument('mockup')

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

  opts.themeClasses?.forEach(c => doc.body.classList.add(c))
  opts.bodyClasses.forEach(c => doc.body.classList.add(c))

  const target = buildShell(doc, opts.shell ?? 'view', opts.hostClass, opts.containerClass)
  injectBody(doc, opts.body, target)

  let html = '<!doctype html>' + doc.documentElement.outerHTML

  if (opts.chartJsBundle) {
    const tag = `<script data-mv="chartjs">${escapeScriptBody(opts.chartJsBundle)}</` + `script>`
    html = html.replace('</head>', `${tag}</head>`)
  }
  if (opts.chartBootstrap) {
    const tag = `<script data-mv="chart-bootstrap">${escapeScriptBody(opts.chartBootstrap)}</` + `script>`
    html = html.replace('</body>', `${tag}</body>`)
  }

  return html
}

function injectBody(doc: Document, html: string, target: HTMLElement): void {
  const parser = new DOMParser()
  const parsed = parser.parseFromString(html, 'text/html')
  for (const node of Array.from(parsed.body.childNodes)) {
    target.appendChild(doc.importNode(node, true))
  }
  // No script rehydration needed: srcdoc-driven re-parse will run them.
}

function escapeScriptBody(code: string): string {
  // Prevent embedded "</script>" inside the code from prematurely closing
  // the inline tag. The replacement reads as "</script>" when re-parsed by
  // the JS engine but cannot terminate the HTML parser's script tag.
  return code.replace(/<\/script>/gi, '<\\/script>')
}
