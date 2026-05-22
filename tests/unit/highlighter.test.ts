import { describe, it, expect } from 'vitest'
import { highlight, escapeHtml } from '../../src/highlighter'

describe('escapeHtml', () => {
  it('escapes &, <, >, ", \'', () => {
    expect(escapeHtml(`<a href="x">&'</a>`))
      .toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;')
  })
})

describe('highlight', () => {
  it('highlights css with span markup', () => {
    const out = highlight('css', '.x { color: red; }')
    expect(out).toContain('<span class="hljs-')
    expect(out).toContain('color')
  })

  it('highlights html with span markup', () => {
    const out = highlight('html', '<div class="x">hi</div>')
    expect(out).toContain('<span class="hljs-')
  })

  it('falls back to escaped plain text for unknown language', () => {
    const out = highlight('rust', 'fn main() { println!("x < y"); }')
    expect(out).not.toContain('<span class="hljs-')
    expect(out).toContain('&quot;x &lt; y&quot;')
  })

  it('returns escaped text if highlight.js throws', () => {
    const out = highlight('css', '')
    expect(typeof out).toBe('string')
  })
})
