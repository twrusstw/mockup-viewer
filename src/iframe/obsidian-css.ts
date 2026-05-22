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
