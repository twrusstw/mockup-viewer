interface CustomPropertyHost {
  length: number
  item(i: number): string
  getPropertyValue(name: string): string
}

export function extractCustomProperties(style: CustomPropertyHost): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 0; i < style.length; i++) {
    const name = style.item(i)
    if (!name.startsWith('--')) continue
    const value = style.getPropertyValue(name).trim()
    if (!value) continue
    out[name] = value
  }
  return out
}

export function buildThemeTokensCss(props: Record<string, string>): string {
  const entries = Object.entries(props)
  if (entries.length === 0) return ''
  const lines = entries.map(([k, v]) => `  ${k}: ${v};`)
  return [
    `:root, body {`,
    ...lines,
    `}`,
    // Obsidian's app.css applies these to body via CSS variables. iframe has no
    // app.css, so we restate the defaults so any plugin styles using inherit /
    // unset / unspecified font-family resolve to the same look as in Obsidian.
    `html, body {`,
    `  font-family: var(--font-interface, var(--font-text, sans-serif));`,
    `  font-size: var(--font-text-size, 16px);`,
    `  color: var(--text-normal);`,
    `  background-color: var(--background-primary);`,
    `  margin: 0;`,
    `}`,
  ].join('\n')
}

export function extractThemeClasses(classes: Iterable<string>): string[] {
  return Array.from(classes).filter(c => c === 'theme-dark' || c === 'theme-light')
}

export function snapshotThemeTokens(): string {
  if (typeof document === 'undefined') return ''
  const docStyle = getComputedStyle(document.documentElement)
  const bodyStyle = getComputedStyle(document.body)
  const merged = { ...extractCustomProperties(docStyle), ...extractCustomProperties(bodyStyle) }
  return buildThemeTokensCss(merged)
}

export function snapshotThemeClasses(): string[] {
  if (typeof document === 'undefined') return []
  return extractThemeClasses(document.body.classList)
}
