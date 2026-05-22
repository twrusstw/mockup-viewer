// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { SourcePanel, type ResolvedSource } from '../../src/view/SourcePanel'

function makeRoot(): HTMLElement {
  document.body.innerHTML = ''
  const root = document.createElement('div')
  document.body.appendChild(root)
  return root
}

/* eslint-disable obsidianmd/hardcoded-config-path */
function makeSources(): ResolvedSource[] {
  return [
    { kind: 'html',   key: 'html',                          path: 'Mockup/a.html',                              content: '<div>a</div>',   editable: true  },
    { kind: 'vault',  key: 'vault:Mockup/draft.css',        path: 'Mockup/draft.css',                           content: '.x{color:red;}', editable: true  },
    { kind: 'plugin', key: 'plugin:penny-stock',            path: '.obsidian/plugins/penny-stock/styles.css',   content: '.p{}',           editable: false },
  ]
}
/* eslint-enable obsidianmd/hardcoded-config-path */

describe('SourcePanel construction', () => {
  let root: HTMLElement
  beforeEach(() => { root = makeRoot() })

  it('renders one tab per source with html first', () => {
    const panel = new SourcePanel(root, { writeFile: async () => {}, onSaved: () => {} })
    panel.setMockup(makeSources())
    const tabs = root.querySelectorAll<HTMLElement>('.mv-tab')
    expect(tabs.length).toBe(3)
    expect(tabs[0].dataset.key).toBe('html')
    expect(tabs[1].dataset.key).toBe('vault:Mockup/draft.css')
    expect(tabs[2].dataset.key).toBe('plugin:penny-stock')
  })

  it('marks read-only tabs with lock class', () => {
    const panel = new SourcePanel(root, { writeFile: async () => {}, onSaved: () => {} })
    panel.setMockup(makeSources())
    const tabs = root.querySelectorAll<HTMLElement>('.mv-tab')
    expect(tabs[0].classList.contains('is-readonly')).toBe(false)
    expect(tabs[1].classList.contains('is-readonly')).toBe(false)
    expect(tabs[2].classList.contains('is-readonly')).toBe(true)
  })

  it('activates html tab by default', () => {
    const panel = new SourcePanel(root, { writeFile: async () => {}, onSaved: () => {} })
    panel.setMockup(makeSources())
    const active = root.querySelector<HTMLElement>('.mv-tab.is-active')
    expect(active?.dataset.key).toBe('html')
  })

  it('switches active tab on click', () => {
    const panel = new SourcePanel(root, { writeFile: async () => {}, onSaved: () => {} })
    panel.setMockup(makeSources())
    const tabs = root.querySelectorAll<HTMLElement>('.mv-tab')
    tabs[1].click()
    expect(tabs[1].classList.contains('is-active')).toBe(true)
    expect(tabs[0].classList.contains('is-active')).toBe(false)
  })
})

describe('SourcePanel editing', () => {
  it('renders a textarea for editable tabs', () => {
    const root = makeRoot()
    const panel = new SourcePanel(root, { writeFile: async () => {}, onSaved: () => {} })
    panel.setMockup(makeSources())
    const ta = root.querySelector<HTMLTextAreaElement>('textarea.mv-editor')
    expect(ta).not.toBeNull()
    expect(ta!.value).toBe('<div>a</div>')
  })

  it('renders highlighted <pre><code> for read-only tabs (no textarea)', () => {
    const root = makeRoot()
    const panel = new SourcePanel(root, { writeFile: async () => {}, onSaved: () => {} })
    panel.setMockup(makeSources())
    const tabs = root.querySelectorAll<HTMLElement>('.mv-tab')
    tabs[2].click()
    expect(root.querySelector('textarea.mv-editor')).toBeNull()
    expect(root.querySelector('pre code')).not.toBeNull()
  })

  it('marks tab dirty on input and enables Save button', () => {
    const root = makeRoot()
    const panel = new SourcePanel(root, { writeFile: async () => {}, onSaved: () => {} })
    panel.setMockup(makeSources())
    const ta = root.querySelector<HTMLTextAreaElement>('textarea.mv-editor')!
    ta.value = '<div>changed</div>'
    ta.dispatchEvent(new Event('input'))
    const tabBtn = root.querySelector<HTMLElement>('.mv-tab[data-key="html"]')!
    expect(tabBtn.querySelector('.mv-tab-dirty')).not.toBeNull()
    const save = root.querySelector<HTMLButtonElement>('.mv-source-toolbar button.mv-save')!
    expect(save.disabled).toBe(false)
  })

  it('save writes via writeFile, calls onSaved, clears dirty', async () => {
    const writes: Array<{ path: string; content: string }> = []
    const saved: Array<{ kind: 'html' | 'css'; path: string; content: string }> = []
    const root = makeRoot()
    const panel = new SourcePanel(root, {
      writeFile: async (path, content) => { writes.push({ path, content }) },
      onSaved: (kind, path, content) => { saved.push({ kind, path, content }) },
    })
    panel.setMockup(makeSources())
    const ta = root.querySelector<HTMLTextAreaElement>('textarea.mv-editor')!
    ta.value = '<div>new</div>'
    ta.dispatchEvent(new Event('input'))
    const save = root.querySelector<HTMLButtonElement>('.mv-source-toolbar button.mv-save')!
    save.click()
    await new Promise((r) => setTimeout(r, 0))
    expect(writes).toEqual([{ path: 'Mockup/a.html', content: '<div>new</div>' }])
    expect(saved).toEqual([{ kind: 'html', path: 'Mockup/a.html', content: '<div>new</div>' }])
    const tabBtn = root.querySelector<HTMLElement>('.mv-tab[data-key="html"]')!
    expect(tabBtn.querySelector('.mv-tab-dirty')).toBeNull()
  })

  it('preserves buffer across tab switch', () => {
    const root = makeRoot()
    const panel = new SourcePanel(root, { writeFile: async () => {}, onSaved: () => {} })
    panel.setMockup(makeSources())
    const ta1 = root.querySelector<HTMLTextAreaElement>('textarea.mv-editor')!
    ta1.value = '<div>edited</div>'
    ta1.dispatchEvent(new Event('input'))
    const tabs = root.querySelectorAll<HTMLElement>('.mv-tab')
    tabs[1].click()
    tabs[0].click()
    const ta2 = root.querySelector<HTMLTextAreaElement>('textarea.mv-editor')!
    expect(ta2.value).toBe('<div>edited</div>')
  })

})

describe('SourcePanel external change', () => {
  it('syncs disk content when tab is not dirty', () => {
    const root = makeRoot()
    const panel = new SourcePanel(root, { writeFile: async () => {}, onSaved: () => {} })
    panel.setMockup(makeSources())
    panel.onExternalChange('Mockup/draft.css', '.y{color:blue;}')
    const tabs = root.querySelectorAll<HTMLElement>('.mv-tab')
    tabs[1].click()
    const ta = root.querySelector<HTMLTextAreaElement>('textarea.mv-editor')!
    expect(ta.value).toBe('.y{color:blue;}')
  })

  it('flags conflict and preserves buffer when tab is dirty', () => {
    const root = makeRoot()
    const panel = new SourcePanel(root, { writeFile: async () => {}, onSaved: () => {} })
    panel.setMockup(makeSources())
    const ta = root.querySelector<HTMLTextAreaElement>('textarea.mv-editor')!
    ta.value = '<div>edited</div>'
    ta.dispatchEvent(new Event('input'))
    panel.onExternalChange('Mockup/a.html', '<div>from disk</div>')
    expect(ta.value).toBe('<div>edited</div>')
    const status = root.querySelector('.mv-source-status.is-conflict')
    expect(status).not.toBeNull()
  })

  it('ignores self-write echo within 200ms of save', async () => {
    const root = makeRoot()
    const panel = new SourcePanel(root, { writeFile: async () => {}, onSaved: () => {} })
    panel.setMockup(makeSources())
    const ta = root.querySelector<HTMLTextAreaElement>('textarea.mv-editor')!
    ta.value = '<div>new</div>'
    ta.dispatchEvent(new Event('input'))
    const save = root.querySelector<HTMLButtonElement>('.mv-source-toolbar button.mv-save')!
    save.click()
    await new Promise((r) => setTimeout(r, 0))
    panel.onExternalChange('Mockup/a.html', '<div>new</div>')
    const status = root.querySelector('.mv-source-status.is-conflict')
    expect(status).toBeNull()
  })

  it('does not crash for path that maps to no tab', () => {
    const root = makeRoot()
    const panel = new SourcePanel(root, { writeFile: async () => {}, onSaved: () => {} })
    panel.setMockup(makeSources())
    expect(() => panel.onExternalChange('Mockup/other.css', '.z{}')).not.toThrow()
  })
})
