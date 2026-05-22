import { describe, it, expect } from 'vitest'
import {
  parseSource, resolveSourcePath, loadSource, loadAllSources,
  isSourceEditable, readSourceContent,
  type SourceAdapter,
} from '../../src/sources'

const CFG = 'cfg'

function fakeAdapter(files: Record<string, string>): SourceAdapter {
  return {
    read: async (path: string) => {
      if (!(path in files)) throw new Error(`mock: ${path} missing`)
      return files[path]
    },
    exists: async (path: string) => path in files,
  }
}

describe('parseSource', () => {
  it('parses plugin prefix', () => {
    expect(parseSource('plugin:my-plugin')).toEqual({ kind: 'plugin', ref: 'my-plugin' })
  })

  it('parses vault prefix with path', () => {
    expect(parseSource('vault:Mockup/draft.css')).toEqual({ kind: 'vault', ref: 'Mockup/draft.css' })
  })

  it('parses snippet prefix', () => {
    expect(parseSource('snippet:my-snippet')).toEqual({ kind: 'snippet', ref: 'my-snippet' })
  })

  it('trims whitespace around input and ref', () => {
    expect(parseSource('  plugin:  foo  ')).toEqual({ kind: 'plugin', ref: 'foo' })
  })

  it('returns null for unknown prefix', () => {
    expect(parseSource('snippet2:foo')).toBeNull()
    expect(parseSource('plugin')).toBeNull()
    expect(parseSource('')).toBeNull()
  })

  it('returns null when ref empty', () => {
    expect(parseSource('plugin:')).toBeNull()
    expect(parseSource('vault: ')).toBeNull()
  })
})

describe('resolveSourcePath', () => {
  it('plugin → <configDir>/plugins/<id>/styles.css', () => {
    expect(resolveSourcePath({ kind: 'plugin', ref: 'my-plugin' }, CFG))
      .toBe(`${CFG}/plugins/my-plugin/styles.css`)
  })

  it('snippet → <configDir>/snippets/<name>.css', () => {
    expect(resolveSourcePath({ kind: 'snippet', ref: 'foo' }, CFG))
      .toBe(`${CFG}/snippets/foo.css`)
  })

  it('vault is workspace-relative when workspaceFolder given', () => {
    expect(resolveSourcePath({ kind: 'vault', ref: 'draft.css' }, CFG, 'Mockup'))
      .toBe('Mockup/draft.css')
  })

  it('vault leading-slash escapes to vault root', () => {
    expect(resolveSourcePath({ kind: 'vault', ref: '/Other/foo.css' }, CFG, 'Mockup'))
      .toBe('Other/foo.css')
  })

  it('vault without workspaceFolder uses ref as-is', () => {
    expect(resolveSourcePath({ kind: 'vault', ref: 'Mockup/draft.css' }, CFG))
      .toBe('Mockup/draft.css')
  })

  it('vault trims trailing slashes from workspaceFolder', () => {
    expect(resolveSourcePath({ kind: 'vault', ref: 'a.css' }, CFG, 'Mockup/'))
      .toBe('Mockup/a.css')
  })

  it('honours a custom configDir (user-renamed Obsidian config folder)', () => {
    expect(resolveSourcePath({ kind: 'plugin', ref: 'x' }, '.config-alt'))
      .toBe('.config-alt/plugins/x/styles.css')
  })
})

describe('loadSource', () => {
  it('reads file content via adapter', async () => {
    const adapter = fakeAdapter({
      [`${CFG}/plugins/x/styles.css`]: '.x { color: red }',
    })
    const css = await loadSource(adapter, { kind: 'plugin', ref: 'x' }, CFG)
    expect(css).toBe('.x { color: red }')
  })

  it('throws when file missing', async () => {
    const adapter = fakeAdapter({})
    await expect(loadSource(adapter, { kind: 'plugin', ref: 'x' }, CFG))
      .rejects.toThrow(/not found/)
  })
})

describe('loadAllSources', () => {
  const adapter = fakeAdapter({
    [`${CFG}/plugins/a/styles.css`]: '/* a */',
    'Mockup/b.css': '/* b */',
    [`${CFG}/snippets/c.css`]: '/* c */',
  })

  it('concatenates valid sources with header comment', async () => {
    const r = await loadAllSources(adapter, ['plugin:a', 'vault:Mockup/b.css', 'snippet:c'], CFG)
    expect(r.errors).toEqual([])
    expect(r.css).toContain('=== plugin:a ===')
    expect(r.css).toContain('/* a */')
    expect(r.css).toContain('=== vault:Mockup/b.css ===')
    expect(r.css).toContain('/* b */')
    expect(r.css).toContain('=== snippet:c ===')
    expect(r.css).toContain('/* c */')
  })

  it('collects errors but keeps loading rest', async () => {
    const r = await loadAllSources(adapter, ['plugin:a', 'badformat', 'plugin:missing', 'vault:Mockup/b.css'], CFG)
    expect(r.errors).toHaveLength(2)
    expect(r.errors[0]).toMatch(/Invalid source format/)
    expect(r.errors[1]).toMatch(/not found/)
    expect(r.css).toContain('/* a */')
    expect(r.css).toContain('/* b */')
  })

  it('empty input returns empty css and no errors', async () => {
    const r = await loadAllSources(adapter, [], CFG)
    expect(r.css).toBe('')
    expect(r.errors).toEqual([])
  })
})

describe('isSourceEditable', () => {
  it('returns true only for vault kind', () => {
    expect(isSourceEditable('vault')).toBe(true)
    expect(isSourceEditable('plugin')).toBe(false)
    expect(isSourceEditable('snippet')).toBe(false)
  })
})

describe('readSourceContent', () => {
  it('returns { path, content } for an existing source', async () => {
    const adapter = fakeAdapter({ 'Mockup/draft.css': '.x { color: red; }' })
    const result = await readSourceContent(adapter, { kind: 'vault', ref: 'draft.css' }, '', 'Mockup')
    expect(result).toEqual({ path: 'Mockup/draft.css', content: '.x { color: red; }' })
  })

  it('throws with the resolved path when file is missing', async () => {
    const adapter = fakeAdapter({})
    /* eslint-disable obsidianmd/hardcoded-config-path */
    await expect(readSourceContent(adapter, { kind: 'plugin', ref: 'foo' }, '.obsidian'))
      .rejects.toThrow('.obsidian/plugins/foo/styles.css')
    /* eslint-enable obsidianmd/hardcoded-config-path */
  })
})
