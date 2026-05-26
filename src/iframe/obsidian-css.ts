// Collect every <link rel="stylesheet"> href from the outer Obsidian document
// so the iframe can re-load the same sheets (app.css, theme, snippets) via its
// own <link> tags. Avoids cloning cssRules into the iframe and keeps the
// iframe visually in sync with the host theme / enabled snippets.
//
// Limitations:
//   - Desktop only. Mobile protocol (capacitor://) is out of scope.
//   - Relies on Obsidian shipping app.css as a <link>; if Obsidian ever
//     switches to inline <style> injection this returns no app.css href and
//     the user must toggle the setting off (or we add an inline fallback).
export function snapshotObsidianStylesheetLinks(): string[] {
  if (typeof document === 'undefined') return []
  const out: string[] = []
  const links = document.querySelectorAll('link[rel="stylesheet"]')
  links.forEach((l) => {
    const href = (l as HTMLLinkElement).href
    if (href) out.push(href)
  })
  return out
}

export function appendObsidianLinks(doc: Document, urls?: string[]): void {
  if (!urls || urls.length === 0) return
  for (const href of urls) {
    const link = doc.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.setAttribute('data-mv', 'obsidian-clone')
    doc.head.appendChild(link)
  }
}

// Pure helper — input is a duck-typed iterable so it stays testable under node
// without jsdom. Real callers pass NodeListOf<HTMLStyleElement>.
interface InlineStyleHost {
  textContent: string | null
  dataset: Record<string, string>
}

export function extractInlineStyleTexts(styles: Iterable<InlineStyleHost>): string[] {
  const out: string[] = []
  for (const s of styles) {
    if (s.dataset.mv) continue // skip mockup-viewer's own injected styles
    const text = s.textContent
    if (!text) continue
    out.push(text)
  }
  return out
}

// Collect every <style> textContent from the outer Obsidian document so the
// iframe can inline-replay them. Obsidian injects theme CSS (e.g. Minimal's
// 267KB theme.css) as <style> rather than <link>, so the link-only snapshot
// misses it entirely. Plugins (Style Settings, etc.) also use <style> for
// dynamically-generated rules.
//
// mockup-viewer's own styles.css gets the same <style> treatment from Obsidian
// — it's tagged data-mv="plugin-own" in main.ts onload so this snapshot skips
// it (would otherwise double-inject .mockup-viewer-root rules into iframe).
export function snapshotObsidianInlineStyles(): string[] {
  if (typeof document === 'undefined') return []
  const nodes = document.querySelectorAll('style')
  return extractInlineStyleTexts(nodes as unknown as Iterable<InlineStyleHost>)
}

export function appendObsidianInlineStyles(doc: Document, texts?: string[]): void {
  if (!texts || texts.length === 0) return
  for (const css of texts) {
    const style = doc.createElement('style')
    style.setAttribute('data-mv', 'obsidian-inline')
    style.textContent = css
    doc.head.appendChild(style)
  }
}
