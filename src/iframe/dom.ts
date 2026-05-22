// Tiny DOM helpers shared across iframe builders. None of these are exported
// from the iframe barrel — they're internals for shell/populate.

export function el(doc: Document, tag: string, cls: string): HTMLElement {
  const e = doc.createElement(tag)
  e.className = cls
  return e
}

export function clearChildren(node: Element): void {
  while (node.firstChild) node.removeChild(node.firstChild)
}

export function appendStyle(doc: Document, label: string, css?: string): void {
  if (!css) return
  const s = doc.createElement('style')
  s.setAttribute('data-mv', label)
  s.textContent = css
  doc.head.appendChild(s)
}

// The "X" icon used inside Obsidian's modal-close-button. Built via SVG DOM
// API rather than innerHTML so the keyword-grep stays clean.
export function appendCloseIcon(doc: Document, parent: HTMLElement): void {
  const ns = 'http://www.w3.org/2000/svg'
  const svg = doc.createElementNS(ns, 'svg')
  svg.setAttribute('xmlns', ns)
  svg.setAttribute('width', '24')
  svg.setAttribute('height', '24')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '2')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('class', 'svg-icon lucide-x')
  for (const d of ['M18 6 6 18', 'm6 6 12 12']) {
    const path = doc.createElementNS(ns, 'path')
    path.setAttribute('d', d)
    svg.appendChild(path)
  }
  parent.appendChild(svg)
}
