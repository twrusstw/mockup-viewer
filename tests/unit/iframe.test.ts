import { describe, it, expect } from 'vitest'
import {
  buildThemeTokensCss, extractCustomProperties, extractFontFacesFromSheets,
  extractThemeClasses,
} from '../../src/iframe'

function fakeStyle(entries: Array<[string, string]>) {
  const map = new Map(entries)
  const names = entries.map(([k]) => k)
  return {
    length: names.length,
    item: (i: number) => names[i],
    getPropertyValue: (n: string) => map.get(n) ?? '',
  }
}

describe('extractCustomProperties', () => {
  it('returns only --* properties with non-empty values', () => {
    const style = fakeStyle([
      ['color', 'red'],
      ['--bg', '#fff'],
      ['--fg', '  #000  '],
      ['--empty', ''],
      ['margin', '4px'],
    ])
    expect(extractCustomProperties(style)).toEqual({ '--bg': '#fff', '--fg': '#000' })
  })

  it('returns empty object when no --* found', () => {
    const style = fakeStyle([['color', 'red']])
    expect(extractCustomProperties(style)).toEqual({})
  })
})

describe('buildThemeTokensCss', () => {
  it('formats as CSS block targeting :root and body', () => {
    const css = buildThemeTokensCss({ '--bg': '#fff', '--fg': '#000' })
    expect(css).toContain(':root, body {')
    expect(css).toContain('--bg: #fff;')
    expect(css).toContain('--fg: #000;')
  })

  it('also writes body font defaults using var() references', () => {
    const css = buildThemeTokensCss({ '--font-interface': 'Inter' })
    expect(css).toContain('font-family: var(--font-interface')
    expect(css).toContain('color: var(--text-normal)')
    expect(css).toContain('background-color: var(--background-primary)')
  })

  it('returns empty string for empty input', () => {
    expect(buildThemeTokensCss({})).toBe('')
  })
})

describe('extractFontFacesFromSheets', () => {
  function fakeRule(text: string, type: number, ctorName?: string) {
    return { cssText: text, type, constructor: { name: ctorName ?? 'CSSRule' } }
  }

  it('extracts @font-face rules via numeric type', () => {
    const sheets = [{
      cssRules: [
        fakeRule('.x { color: red }', 1),
        fakeRule('@font-face { font-family: "A"; src: url("a.woff2") }', 5),
        fakeRule('.y { margin: 0 }', 1),
      ],
    }]
    const css = extractFontFacesFromSheets(sheets)
    expect(css).toContain('@font-face')
    expect(css).toContain('"A"')
    expect(css).not.toContain('.x')
    expect(css).not.toContain('.y')
  })

  it('extracts @font-face rules via constructor name fallback', () => {
    const sheets = [{
      cssRules: [fakeRule('@font-face { src: url(b) }', 0, 'CSSFontFaceRule')],
    }]
    const css = extractFontFacesFromSheets(sheets)
    expect(css).toContain('@font-face')
  })

  it('extracts via cssText regex fallback when type & ctor unknown', () => {
    const sheets = [{
      cssRules: [fakeRule('@font-face { src: url(c) }', 99, 'WeirdRule')],
    }]
    expect(extractFontFacesFromSheets(sheets)).toContain('@font-face')
  })

  it('skips sheets with null cssRules (cross-origin)', () => {
    const sheets = [{ cssRules: null }] as unknown as ArrayLike<{ cssRules: null; href: null }>
    // type cast: extractFontFacesFromSheets accepts ArrayLike<CssStyleSheetLike>
    expect(extractFontFacesFromSheets(sheets as never)).toBe('')
  })

  it('handles cssRules access throw (cross-origin)', () => {
    const sheets = [{
      get cssRules() { throw new Error('SecurityError') },
    }] as unknown as ArrayLike<{ cssRules: never }>
    expect(extractFontFacesFromSheets(sheets as never)).toBe('')
  })
})

describe('extractThemeClasses', () => {
  it('keeps Obsidian theme classes and drops unrelated body classes', () => {
    const classes = extractThemeClasses(['theme-dark', 'is-phone', 'mod-macos'])
    expect(classes).toEqual(['theme-dark'])
  })

  it('supports light theme class', () => {
    const classes = extractThemeClasses(['theme-light'])
    expect(classes).toEqual(['theme-light'])
  })
})
