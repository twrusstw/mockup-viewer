import { describe, it, expect } from 'vitest'
import { extractInlineStyleTexts } from '../../src/iframe/obsidian-css'

interface FakeStyle {
  textContent: string | null
  dataset: Record<string, string>
}

function s(textContent: string, dataset: Record<string, string> = {}): FakeStyle {
  return { textContent, dataset }
}

describe('extractInlineStyleTexts', () => {
  it('returns textContent for every non-empty <style>', () => {
    const result = extractInlineStyleTexts([
      s('.a { color: red }'),
      s('.b { color: blue }'),
    ])
    expect(result).toEqual(['.a { color: red }', '.b { color: blue }'])
  })

  it('skips elements whose textContent is empty or null', () => {
    const result = extractInlineStyleTexts([s(''), s('.a {}'), s(null as unknown as string)])
    expect(result).toEqual(['.a {}'])
  })

  it('skips elements tagged with data-mv (own plugin styles)', () => {
    const result = extractInlineStyleTexts([
      s('.own { color: red }', { mv: 'plugin-own' }),
      s('.theme { color: blue }'),
    ])
    expect(result).toEqual(['.theme { color: blue }'])
  })

  it('preserves source order', () => {
    const result = extractInlineStyleTexts([
      s('/* first */ .a {}'),
      s('/* second */ .b {}'),
      s('/* third */ .c {}'),
    ])
    expect(result[0]).toContain('first')
    expect(result[1]).toContain('second')
    expect(result[2]).toContain('third')
  })
})
