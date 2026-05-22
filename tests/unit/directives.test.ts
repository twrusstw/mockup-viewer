import { describe, it, expect } from 'vitest'
import {
  parseMockup,
  parseViewport,
  resolveViewport,
  resolveViewportBodyClasses,
  VIEWPORT_PRESETS,
} from '../../src/directives'

describe('parseMockup', () => {
  it('returns empty directives for plain HTML', () => {
    const r = parseMockup('<div>hello</div>')
    expect(r.directives).toEqual({})
    expect(r.body).toBe('<div>hello</div>')
  })

  it('parses single host directive', () => {
    const r = parseMockup('<!-- host: pw-dashboard -->\n<div></div>')
    expect(r.directives.host).toBe('pw-dashboard')
    expect(r.body).toBe('<div></div>')
  })

  it('parses multiple directives in sequence', () => {
    const raw = [
      '<!-- host: pw-detail -->',
      '<!-- title: Add transaction -->',
      '<!-- viewport: mobile -->',
      '<!-- body-class: is-phone is-keyboard-open -->',
      '<div>x</div>',
    ].join('\n')
    const r = parseMockup(raw)
    expect(r.directives).toEqual({
      host: 'pw-detail',
      title: 'Add transaction',
      viewport: 'mobile',
      bodyClass: ['is-phone', 'is-keyboard-open'],
    })
    expect(r.body.trim()).toBe('<div>x</div>')
  })

  it('parses comma-separated styles list and trims entries', () => {
    const r = parseMockup('<!-- styles:  plugin:foo , vault:Mockup/x.css , snippet:y  -->\n<div></div>')
    expect(r.directives.styles).toEqual(['plugin:foo', 'vault:Mockup/x.css', 'snippet:y'])
  })

  it('ignores empty value', () => {
    const r = parseMockup('<!-- host:   -->\n<div></div>')
    expect(r.directives.host).toBeUndefined()
  })

  it('is case-insensitive on directive key', () => {
    const r = parseMockup('<!-- HOST: foo -->\n<div></div>')
    expect(r.directives.host).toBe('foo')
  })

  it('stops at first non-directive content', () => {
    const r = parseMockup('<!-- host: a -->\n<div></div>\n<!-- title: ignored -->')
    expect(r.directives.host).toBe('a')
    expect(r.directives.title).toBeUndefined()
    expect(r.body).toContain('<!-- title: ignored -->')
  })

  it('unknown directive consumed but ignored', () => {
    const r = parseMockup('<!-- unknown: foo -->\n<!-- host: a -->\n<div></div>')
    expect(r.directives.host).toBe('a')
  })

  it('body-class splits on whitespace and drops empties', () => {
    const r = parseMockup('<!-- body-class:  is-phone   is-keyboard  -->\n<div></div>')
    expect(r.directives.bodyClass).toEqual(['is-phone', 'is-keyboard'])
  })

  it('as directive accepts known shells', () => {
    expect(parseMockup('<!-- as: modal -->\n<div></div>').directives.as).toBe('modal')
    expect(parseMockup('<!-- as: VIEW -->\n<div></div>').directives.as).toBe('view')
    expect(parseMockup('<!-- as: settings -->\n<div></div>').directives.as).toBe('settings')
    expect(parseMockup('<!-- as: popover -->\n<div></div>').directives.as).toBe('popover')
    expect(parseMockup('<!-- as: suggest -->\n<div></div>').directives.as).toBe('suggest')
  })

  it('as directive ignores unknown values', () => {
    expect(parseMockup('<!-- as: garbage -->\n<div></div>').directives.as).toBeUndefined()
  })

  it('container directive captures class name', () => {
    expect(parseMockup('<!-- container: pw-transaction-modal-container -->\n<div></div>').directives.container)
      .toBe('pw-transaction-modal-container')
  })
})

describe('parseViewport', () => {
  it('resolves preset names', () => {
    expect(parseViewport('desktop')).toEqual(VIEWPORT_PRESETS.desktop)
    expect(parseViewport('tablet')).toEqual(VIEWPORT_PRESETS.tablet)
    expect(parseViewport('mobile')).toEqual({ width: 430, height: 932, label: 'Mobile 430×932' })
  })

  it('is case-insensitive', () => {
    expect(parseViewport('MOBILE')).toEqual(VIEWPORT_PRESETS.mobile)
  })

  it('parses WxH numeric form', () => {
    const v = parseViewport('800x600')
    expect(v).toEqual({ width: 800, height: 600, label: '800×600' })
  })

  it('tolerates spaces around x', () => {
    const v = parseViewport('800 x 600')
    expect(v).toEqual({ width: 800, height: 600, label: '800×600' })
  })

  it('returns null for unknown', () => {
    expect(parseViewport('garbage')).toBeNull()
    expect(parseViewport('')).toBeNull()
  })
})

describe('resolveViewport', () => {
  it('uses directive viewport before settings default', () => {
    expect(resolveViewport('mobile', 'desktop')).toEqual(VIEWPORT_PRESETS.mobile)
  })

  it('falls back to settings default when directive is missing', () => {
    expect(resolveViewport(undefined, 'mobile')).toEqual(VIEWPORT_PRESETS.mobile)
  })
})

describe('resolveViewportBodyClasses', () => {
  it('adds demo-vault mobile classes for the mobile preset', () => {
    expect(resolveViewportBodyClasses('mobile', 'desktop')).toEqual(['is-phone', 'is-mobile'])
  })

  it('uses settings default when directive is missing', () => {
    expect(resolveViewportBodyClasses(undefined, 'mobile')).toEqual(['is-phone', 'is-mobile'])
  })

  it('does not add mobile classes for custom numeric viewport', () => {
    expect(resolveViewportBodyClasses('430x932', 'desktop')).toEqual([])
  })
})
