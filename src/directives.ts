// Pure parser for mockup HTML leading directives.
//
// Supported directives (must appear contiguously at top of file before any other content):
//   <!-- host: pw-dashboard -->            → add class to iframe body
//   <!-- title: Dashboard view -->         → display label (currently unused by viewer)
//   <!-- styles: plugin:foo, vault:x.css --> → override settings.sources for this mockup
//   <!-- viewport: mobile -->              → preset name or WxH (e.g. 800x600)
//   <!-- body-class: is-phone is-keyboard --> → additional iframe body classes

export type ComponentShell = 'view' | 'modal' | 'settings' | 'popover' | 'suggest'

export const COMPONENT_SHELLS: ComponentShell[] = ['view', 'modal', 'settings', 'popover', 'suggest']

export interface Directives {
  host?: string
  title?: string
  styles?: string[]
  viewport?: string
  bodyClass?: string[]
  as?: ComponentShell
  container?: string
}

export interface ParsedMockup {
  directives: Directives
  body: string
}

const DIRECTIVE_RE = /^\s*<!--\s*([a-z-]+)\s*:\s*([^>]*?)\s*-->\s*/i

export function parseMockup(raw: string): ParsedMockup {
  const directives: Directives = {}
  let body = raw

  while (true) {
    const m = body.match(DIRECTIVE_RE)
    if (!m) break

    const key = m[1].toLowerCase()
    const value = m[2].trim()
    body = body.slice(m[0].length)

    if (!value) continue

    switch (key) {
      case 'host':
        directives.host = value
        break
      case 'title':
        directives.title = value
        break
      case 'styles':
        directives.styles = value.split(',').map(s => s.trim()).filter(Boolean)
        break
      case 'viewport':
        directives.viewport = value
        break
      case 'body-class':
        directives.bodyClass = value.split(/\s+/).filter(Boolean)
        break
      case 'as': {
        const v = value.toLowerCase() as ComponentShell
        if ((COMPONENT_SHELLS as string[]).includes(v)) directives.as = v
        break
      }
      case 'container':
        directives.container = value
        break
    }
  }

  return { directives, body }
}

export interface Viewport {
  width: number | null
  height: number | null
  label: string
}

export const VIEWPORT_PRESETS: Record<string, Viewport> = {
  desktop: { width: null, height: null, label: 'Desktop' },
  tablet: { width: 810, height: 1080, label: 'Tablet 810×1080' },
  mobile: { width: 430, height: 932, label: 'Mobile 430×932' },
}

const WXH_RE = /^(\d+)\s*x\s*(\d+)$/i

export function parseViewport(raw: string): Viewport | null {
  const v = raw.trim().toLowerCase()
  if (v in VIEWPORT_PRESETS) return VIEWPORT_PRESETS[v]
  const m = v.match(WXH_RE)
  if (m) {
    return { width: Number(m[1]), height: Number(m[2]), label: `${m[1]}×${m[2]}` }
  }
  return null
}

export function resolveViewport(directive: string | undefined, defaultViewport: string): Viewport {
  return parseViewport(directive ?? defaultViewport) ?? VIEWPORT_PRESETS.desktop
}

export function resolveViewportBodyClasses(directive: string | undefined, defaultViewport: string): string[] {
  const raw = (directive ?? defaultViewport).trim().toLowerCase()
  return raw === 'mobile' ? ['is-phone', 'is-mobile'] : []
}
