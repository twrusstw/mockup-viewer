import { highlight, escapeHtml } from '../highlighter'

export type SourceKind = 'html' | 'vault' | 'plugin' | 'snippet'

export interface ResolvedSource {
  kind: SourceKind
  key: string
  path: string
  content: string
  editable: boolean
}

export interface SourcePanelDeps {
  writeFile: (path: string, content: string) => Promise<void>
  onSaved: (kind: 'html' | 'css', path: string, content: string) => void
}

interface TabState {
  source: ResolvedSource
  diskContent: string
  buffer: string
  dirty: boolean
  externalChangedWhileDirty: boolean
}

export class SourcePanel {
  private rootEl: HTMLElement
  private tabsEl!: HTMLElement
  private toolbarEl!: HTMLElement
  private bodyEl!: HTMLElement
  private deps: SourcePanelDeps
  private tabs = new Map<string, TabState>()
  private activeKey: string | null = null
  private lastSelfWriteAt = 0
  private lastSelfWriteContent = ''

  constructor(parent: HTMLElement, deps: SourcePanelDeps) {
    this.deps = deps
    const doc = parent.ownerDocument
    this.rootEl = doc.createElement('div')
    this.rootEl.className = 'mv-source-panel'
    parent.appendChild(this.rootEl)

    this.tabsEl = doc.createElement('div')
    this.tabsEl.className = 'mv-source-tabs'
    this.rootEl.appendChild(this.tabsEl)

    this.toolbarEl = doc.createElement('div')
    this.toolbarEl.className = 'mv-source-toolbar'
    this.rootEl.appendChild(this.toolbarEl)
    this.renderToolbar()

    this.bodyEl = doc.createElement('div')
    this.bodyEl.className = 'mv-source-body'
    this.rootEl.appendChild(this.bodyEl)
  }

  setMockup(sources: ResolvedSource[]): void {
    this.tabs.clear()
    for (const s of sources) {
      this.tabs.set(s.key, {
        source: s,
        diskContent: s.content,
        buffer: s.content,
        dirty: false,
        externalChangedWhileDirty: false,
      })
    }
    this.renderTabs()
    const firstKey = sources[0]?.key ?? null
    this.activeKey = firstKey
    this.refreshActiveTabClass()
    this.renderBody()
    this.refreshToolbar()
  }

  destroy(): void {
    this.rootEl.remove()
    this.tabs.clear()
    this.activeKey = null
  }

  get element(): HTMLElement { return this.rootEl }

  private renderTabs(): void {
    const doc = this.rootEl.ownerDocument
    this.tabsEl.replaceChildren()
    for (const [key, tab] of this.tabs) {
      const el = doc.createElement('button')
      el.className = 'mv-tab'
      el.dataset.key = key
      if (!tab.source.editable) el.classList.add('is-readonly')
      el.textContent = labelFor(tab.source)
      if (tab.dirty) {
        const dot = doc.createElement('span')
        dot.className = 'mv-tab-dirty'
        dot.textContent = '•'
        el.appendChild(dot)
      }
      if (!tab.source.editable) {
        const lock = doc.createElement('span')
        lock.className = 'mv-tab-lock'
        lock.textContent = '🔒'
        el.appendChild(lock)
      }
      el.addEventListener('click', () => this.activate(key))
      this.tabsEl.appendChild(el)
    }
    this.refreshActiveTabClass()
  }

  private refreshActiveTabClass(): void {
    this.tabsEl.querySelectorAll<HTMLElement>('.mv-tab').forEach((el) => {
      el.classList.toggle('is-active', el.dataset.key === this.activeKey)
    })
  }

  private activate(key: string): void {
    if (!this.tabs.has(key)) return
    this.activeKey = key
    this.refreshActiveTabClass()
    this.renderBody()
    this.refreshToolbar()
  }

  private renderToolbar(): void {
    const doc = this.rootEl.ownerDocument
    this.toolbarEl.replaceChildren()
    const save = doc.createElement('button')
    save.className = 'mv-save'
    save.textContent = 'Save'
    save.disabled = true
    save.addEventListener('click', () => { void this.save() })
    this.toolbarEl.appendChild(save)
    const status = doc.createElement('span')
    status.className = 'mv-source-status'
    this.toolbarEl.appendChild(status)
  }

  private refreshToolbar(): void {
    const save = this.toolbarEl.querySelector<HTMLButtonElement>('button.mv-save')
    const status = this.toolbarEl.querySelector<HTMLElement>('.mv-source-status')
    if (!save || !status) return
    const tab = this.activeKey ? this.tabs.get(this.activeKey) : null
    save.disabled = !tab || !tab.source.editable || !tab.dirty
    if (tab?.externalChangedWhileDirty) {
      status.className = 'mv-source-status is-conflict'
      // eslint-disable-next-line obsidianmd/ui/sentence-case
      status.textContent = '⚠ File changed externally while you were editing.'
    } else {
      status.className = 'mv-source-status'
      status.textContent = tab?.dirty ? 'Unsaved changes' : ''
    }
  }

  private renderBody(): void {
    const doc = this.rootEl.ownerDocument
    this.bodyEl.replaceChildren()
    if (!this.activeKey) return
    const tab = this.tabs.get(this.activeKey)!
    const lang = tab.source.kind === 'html' ? 'html' : 'css'
    if (tab.source.editable) {
      const ta = doc.createElement('textarea')
      ta.className = 'mv-editor'
      ta.value = tab.buffer
      ta.spellcheck = false
      ta.addEventListener('input', () => {
        tab.buffer = ta.value
        tab.dirty = tab.buffer !== tab.diskContent
        this.refreshDirtyDot(tab.source.key, tab.dirty)
        this.refreshToolbar()
      })
      this.bodyEl.appendChild(ta)
    } else {
      const pre = doc.createElement('pre')
      const code = doc.createElement('code')
      // hljs output is trusted (escaped + span markup only)
      // eslint-disable-next-line @microsoft/sdl/no-inner-html
      code.innerHTML = highlight(lang, tab.buffer)
      pre.appendChild(code)
      this.bodyEl.appendChild(pre)
    }
  }

  private refreshDirtyDot(key: string, dirty: boolean): void {
    const tabEl = this.tabsEl.querySelector<HTMLElement>(`.mv-tab[data-key="${cssEscape(key)}"]`)
    if (!tabEl) return
    let dot = tabEl.querySelector<HTMLElement>('.mv-tab-dirty')
    if (dirty && !dot) {
      dot = this.rootEl.ownerDocument.createElement('span')
      dot.className = 'mv-tab-dirty'
      dot.textContent = '•'
      tabEl.appendChild(dot)
    } else if (!dirty && dot) {
      dot.remove()
    }
  }

  private async save(): Promise<void> {
    if (!this.activeKey) return
    const tab = this.tabs.get(this.activeKey)
    if (!tab || !tab.source.editable || !tab.dirty) return
    const content = tab.buffer
    const path = tab.source.path
    try {
      this.lastSelfWriteAt = Date.now()
      this.lastSelfWriteContent = content
      await this.deps.writeFile(path, content)
      tab.diskContent = content
      tab.dirty = false
      tab.externalChangedWhileDirty = false
      this.refreshDirtyDot(tab.source.key, false)
      this.refreshToolbar()
      this.deps.onSaved(tab.source.kind === 'html' ? 'html' : 'css', path, content)
    } catch (err) {
      const status = this.toolbarEl.querySelector<HTMLElement>('.mv-source-status')
      if (status) {
        status.className = 'mv-source-status is-error'
        status.textContent = `Save failed: ${(err as Error).message}`
      }
    }
  }

  onExternalChange(path: string, newContent: string): void {
    const tab = this.findTabByPath(path)
    if (!tab) return
    if (
      Date.now() - this.lastSelfWriteAt < 200 &&
      newContent === this.lastSelfWriteContent
    ) {
      return
    }
    if (!tab.dirty) {
      tab.diskContent = newContent
      tab.buffer = newContent
      tab.externalChangedWhileDirty = false
      if (this.activeKey === tab.source.key) {
        this.renderBody()
        this.refreshToolbar()
      }
    } else {
      tab.diskContent = newContent
      tab.externalChangedWhileDirty = true
      if (this.activeKey === tab.source.key) this.refreshToolbar()
    }
  }

  private findTabByPath(path: string): TabState | undefined {
    for (const tab of this.tabs.values()) {
      if (tab.source.path === path) return tab
    }
    return undefined
  }
}

function labelFor(s: ResolvedSource): string {
  if (s.kind === 'html') return 'HTML'
  return s.key
}

function cssEscape(s: string): string {
  return s.replace(/(["\\])/g, '\\$1')
}

export { escapeHtml }
