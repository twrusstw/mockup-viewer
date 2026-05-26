import { ItemView, Notice, TFile, TFolder, WorkspaceLeaf } from 'obsidian'
import type MockupViewerPlugin from '../main'
import {
  parseMockup,
  resolveViewport,
  resolveViewportBodyClasses,
} from '../directives'
import {
  loadAllSources,
  parseSource,
  resolveSourcePath,
  isSourceEditable,
  type SourceAdapter,
} from '../sources'
import { SourcePanel, type ResolvedSource } from './SourcePanel'
import { SourcePickerModal } from './SourcePickerModal'
import {
  createBlankIframe, populateIframe,
  snapshotThemeTokens, snapshotFontFaces, snapshotThemeClasses,
  snapshotObsidianStylesheetLinks, snapshotObsidianInlineStyles,
} from '../iframe'
import { CHART_BOOTSTRAP, EXAMPLE_HTML, SAMPLE_PACK } from './constants'
import { applyViewport } from './viewport'
import { renderEmptyState, type EmptyStateKind } from './empty-state'

export const MOCKUP_VIEW_TYPE = 'mockup-viewer'

declare const __CHART_JS_BUNDLE__: string

const RENDER_DEBOUNCE_MS = 200

export class MockupView extends ItemView {
  // Host (left/main area)
  private hostEl!: HTMLDivElement
  private reopenPanelBtn!: HTMLButtonElement
  private previewEl!: HTMLDivElement
  private sourceEl!: HTMLDivElement
  private sourcePanel: SourcePanel | null = null
  private mode: 'preview' | 'source' = 'preview'
  private modeToggleBtn!: HTMLButtonElement

  // Panel (right inspector, all controls live here)
  private panelEl!: HTMLDivElement
  private collapsePanelBtn!: HTMLButtonElement
  private fileSelect!: HTMLSelectElement
  private viewportSegment!: HTMLDivElement
  private bodyChipsEl!: HTMLDivElement
  private sourceChipsEl!: HTMLDivElement

  private currentFile: TFile | null = null
  private lastRenderedPath: string | null = null
  private debounceTimers = new Map<string, number>()
  private themeChangeTimer: number | null = null

  // Per-session state — overrides settings default + mockup directive when set
  // by the user. Reset to directive/default whenever the user switches mockup.
  private currentViewport = 'desktop'
  private extraBodyClasses: string[] = []
  private panelCollapsed = false

  constructor(leaf: WorkspaceLeaf, private plugin: MockupViewerPlugin) {
    super(leaf)
  }

  getViewType(): string {
    return MOCKUP_VIEW_TYPE
  }

  getDisplayText(): string {
    return 'Mockup viewer'
  }

  getIcon(): string {
    return 'layout-template'
  }

  async onOpen(): Promise<void> {
    const root = this.contentEl
    root.empty()
    root.addClass('mockup-viewer-root')

    this.hostEl = root.createDiv({ cls: 'mockup-viewer-host' })

    this.reopenPanelBtn = this.hostEl.createEl('button', {
      text: '«',
      cls: 'mockup-viewer-reopen',
      attr: { 'aria-label': 'Show panel' },
    })
    this.reopenPanelBtn.hide()
    this.reopenPanelBtn.addEventListener('click', () => this.setPanelCollapsed(false))

    this.previewEl = this.hostEl.createDiv({ cls: 'mockup-viewer-preview' })
    this.sourceEl = this.hostEl.createDiv({ cls: 'mockup-viewer-source' })
    this.sourceEl.style.display = this.mode === 'source' ? '' : 'none'

    this.panelEl = root.createDiv({ cls: 'mv-panel' })

    // Collapse handle lives at root level so it isn't clipped by the panel's
    // overflow context, and so its position can mirror the reopen handle.
    this.collapsePanelBtn = root.createEl('button', {
      text: '»',
      cls: 'mockup-viewer-collapse',
      attr: { 'aria-label': 'Collapse panel' },
    })
    this.collapsePanelBtn.addEventListener('click', () => this.setPanelCollapsed(true))

    this.buildPanel()

    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (!(file instanceof TFile)) return
        if (this.currentFile && file.path === this.currentFile.path) {
          this.scheduleRender(file)
        }
        const panel = this.sourcePanel
        if (panel) {
          void this.app.vault.adapter
            .read(file.path)
            .then((content) => panel.onExternalChange(file.path, content))
            .catch(() => { /* file removed or unreadable; ignore */ })
        }
      }),
    )

    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (!(file instanceof TFile)) return
        if (this.currentFile && file.path !== this.currentFile.path) {
          void this.isActiveSourceFile(file.path).then((isSource) => {
            if (isSource) this.scheduleRender(this.currentFile!)
          })
        }
      }),
    )

    this.registerEvent(
      this.app.vault.on('create', (file) => {
        if (file instanceof TFile && this.isMockupFile(file)) this.refreshList()
      }),
    )

    this.registerEvent(
      this.app.vault.on('delete', (file) => {
        if (file instanceof TFile && this.isMockupFile(file)) this.refreshList()
      }),
    )

    this.registerEvent(
      this.app.workspace.on('mockup-viewer:settings-changed' as never, () => {
        this.renderSourceChips()
        if (this.currentFile) void this.render(this.currentFile)
        else this.refreshList()
      }),
    )

    this.registerEvent(
      this.app.workspace.on('css-change' as never, () => {
        if (this.themeChangeTimer !== null) window.clearTimeout(this.themeChangeTimer)
        this.themeChangeTimer = window.setTimeout(() => {
          this.themeChangeTimer = null
          if (this.currentFile) void this.render(this.currentFile)
        }, RENDER_DEBOUNCE_MS)
      }),
    )

    this.refreshList()
  }

  async onClose(): Promise<void> {
    this.debounceTimers.forEach((id) => window.clearTimeout(id))
    this.debounceTimers.clear()
    if (this.themeChangeTimer !== null) window.clearTimeout(this.themeChangeTimer)
    this.themeChangeTimer = null
    this.sourcePanel?.destroy()
    this.sourcePanel = null
    this.contentEl.empty()
  }

  // ────────────────────────────── Panel build ────────────────────────────

  private buildPanel(): void {
    const p = this.panelEl
    p.empty()

    // Header (collapse button lives at root level — see onOpen — so it isn't
    // clipped by .mv-panel's overflow context).
    const head = p.createDiv({ cls: 'mv-panel-head' })
    head.createSpan({ text: 'Mockup Viewer', cls: 'mv-panel-title' })

    // ── Section: FILE ──
    this.section(p, 'File')
    const fileRow = p.createDiv({ cls: 'mv-file-row' })
    this.fileSelect = fileRow.createEl('select', { cls: 'mv-config-input mv-file-select' })
    this.fileSelect.addEventListener('change', () => this.onSelectChange())
    const reloadBtn = fileRow.createEl('button', { text: 'Reload', cls: 'mv-reload-btn', attr: { 'aria-label': 'Reload' } })
    reloadBtn.addEventListener('click', () => this.refreshList())

    const modeRow = p.createDiv({ cls: 'mv-mode-row' })
    this.modeToggleBtn = modeRow.createEl('button', {
      cls: 'mv-mode-toggle',
      attr: { 'aria-label': 'Toggle source view' },
    })
    this.modeToggleBtn.addEventListener('click', () => this.toggleMode())
    this.refreshModeToggle()

    // ── Section: VIEWPORT ──
    this.section(p, 'Viewport')
    this.viewportSegment = p.createDiv({ cls: 'mv-segment' })
    const viewports: Array<{ name: string; label: string }> = [
      { name: 'desktop', label: 'Desktop' },
      { name: 'tablet', label: 'Tablet' },
      { name: 'mobile', label: 'Mobile' },
    ]
    for (const v of viewports) {
      const btn = this.viewportSegment.createEl('button', { text: v.label, cls: 'mv-segment-btn' })
      btn.dataset.viewport = v.name
      btn.addEventListener('click', () => this.setViewport(v.name))
    }

    // ── Section: BODY CLASSES ──
    this.section(p, 'Body classes')
    p.createEl('p', { cls: 'mv-config-hint', text: 'Live-applied to iframe body. Mockup directive + viewport classes are added automatically.' })
    this.bodyChipsEl = p.createDiv({ cls: 'mv-bclass-chips' })
    const bcInput = p.createEl('input', {
      type: 'text',
      placeholder: '+ class (press Enter)',
      cls: 'mv-config-input',
    })
    bcInput.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter') return
      ev.preventDefault()
      const v = bcInput.value.trim()
      if (v) {
        this.addExtraBodyClass(v)
        bcInput.value = ''
      }
    })

    p.createEl('hr', { cls: 'mv-divider' })

    // ── Section: SOURCES ──
    this.section(p, 'Stylesheet sources')
    p.createEl('p', { cls: 'mv-config-hint', text: 'Order matters; later sources override earlier.' })
    this.sourceChipsEl = p.createDiv({ cls: 'mv-source-chips' })
    const addSourceBtn = p.createEl('button', { text: 'Add source', cls: 'mv-add-source' })
    addSourceBtn.addEventListener('click', () => this.openSourcePicker())

    p.createEl('hr', { cls: 'mv-divider' })

    // ── Section: WORKSPACE FOLDER ──
    this.section(p, 'Workspace folder')
    p.createEl('p', { cls: 'mv-config-hint', text: 'Folder under the vault root scanned for HTML mockups.' })
    const folderInput = p.createEl('input', {
      type: 'text',
      cls: 'mv-config-input',
      attr: { placeholder: 'Mockup' },
    })
    folderInput.value = this.plugin.settings.mockupFolder
    folderInput.addEventListener('change', () => {
      this.plugin.settings.mockupFolder = folderInput.value.trim() || 'Mockup'
      void this.plugin.saveSettings()
    })

    // Trust warning at the bottom
    const trust = p.createDiv({ cls: 'mv-config-trust' })
    trust.createEl('strong', { text: 'Trust model: ' })
    trust.createSpan({ text: 'open mockups only from sources you trust. The viewer does not sanitize HTML or scripts.' })

    this.renderSourceChips()
  }

  private section(parent: HTMLElement, label: string): void {
    parent.createEl('h3', { text: label, cls: 'mv-section-title' })
  }

  private renderSourceChips(): void {
    if (!this.sourceChipsEl) return
    this.sourceChipsEl.empty()
    const sources = this.plugin.settings.sources
    if (sources.length === 0) {
      this.sourceChipsEl.createDiv({ cls: 'mv-source-empty', text: 'No sources yet.' })
      return
    }
    sources.forEach((raw, idx) => {
      const chip = this.sourceChipsEl.createDiv({ cls: 'mv-source-chip' })
      const colon = raw.indexOf(':')
      const kind = colon > 0 ? raw.slice(0, colon) : '?'
      const ref = colon > 0 ? raw.slice(colon + 1) : raw
      chip.createSpan({ cls: 'mv-source-kind', text: kind })
      chip.createSpan({ cls: 'mv-source-ref', text: ref })
      const x = chip.createSpan({ cls: 'mv-source-x', text: '×' })
      x.addEventListener('click', () => {
        this.plugin.settings.sources = this.plugin.settings.sources.filter((_, i) => i !== idx)
        void this.plugin.saveSettings()
      })
    })
  }

  private openSourcePicker(): void {
    new SourcePickerModal(this.app, (raw) => {
      if (!raw) return
      this.plugin.settings.sources = [...this.plugin.settings.sources, raw]
      void this.plugin.saveSettings()
    }).open()
  }

  private setPanelCollapsed(collapsed: boolean): void {
    this.panelCollapsed = collapsed
    this.panelEl.style.display = collapsed ? 'none' : ''
    this.collapsePanelBtn.style.display = collapsed ? 'none' : ''
    if (collapsed) this.reopenPanelBtn.show()
    else this.reopenPanelBtn.hide()
  }

  // ────────────────────────────── File discovery ─────────────────────────

  private mockupFolder(): string {
    return this.plugin.settings.mockupFolder || 'Mockup'
  }

  private isMockupFile(file: TFile): boolean {
    const folder = this.mockupFolder()
    return file.path.startsWith(`${folder}/`) && file.extension === 'html'
  }

  private listMockupFiles(): TFile[] {
    const folder = this.app.vault.getAbstractFileByPath(this.mockupFolder())
    if (!(folder instanceof TFolder)) return []
    return folder.children
      .filter((f): f is TFile => f instanceof TFile && f.extension === 'html')
      .sort((a, b) => a.path.localeCompare(b.path))
  }

  private refreshList(): void {
    const sources = this.plugin.settings.sources
    if (sources.length === 0) {
      this.showEmptyState('no-sources')
      return
    }

    const files = this.listMockupFiles()
    const previousPath = this.currentFile?.path ?? null

    this.fileSelect.empty()
    this.fileSelect.disabled = false

    if (files.length === 0) {
      this.showEmptyState('no-files')
      return
    }

    const folderPrefix = this.mockupFolder() + '/'
    for (const file of files) {
      const display = file.path.startsWith(folderPrefix)
        ? file.path.slice(folderPrefix.length)
        : file.path
      const opt = this.fileSelect.createEl('option', { text: display })
      opt.value = file.path
    }

    const target = files.find((f) => f.path === previousPath) ?? files[0]
    this.fileSelect.value = target.path
    void this.render(target)
  }

  private onSelectChange(): void {
    const path = this.fileSelect.value
    if (!path) return
    const file = this.app.vault.getAbstractFileByPath(path)
    if (file instanceof TFile) {
      void this.render(file)
    }
  }

  private scheduleRender(file: TFile): void {
    const existing = this.debounceTimers.get(file.path)
    if (existing) window.clearTimeout(existing)
    const id = window.setTimeout(() => {
      this.debounceTimers.delete(file.path)
      void this.render(file)
    }, RENDER_DEBOUNCE_MS)
    this.debounceTimers.set(file.path, id)
  }

  // ────────────────────────────── Toolbar state ──────────────────────────

  private setViewport(name: string): void {
    if (this.currentViewport === name) return
    this.currentViewport = name
    if (this.currentFile) void this.render(this.currentFile)
  }

  private updateViewportButtons(): void {
    const buttons = this.viewportSegment.querySelectorAll<HTMLButtonElement>('.mv-segment-btn')
    const matchKey = this.currentViewport.toLowerCase()
    buttons.forEach((b) => {
      b.toggleClass('is-active', b.dataset.viewport === matchKey)
    })
  }

  private addExtraBodyClass(name: string): void {
    if (this.extraBodyClasses.includes(name)) return
    this.extraBodyClasses.push(name)
    this.renderBodyClassChips()
    this.patchIframeBodyClasses()
  }

  private removeExtraBodyClass(name: string): void {
    this.extraBodyClasses = this.extraBodyClasses.filter((c) => c !== name)
    this.renderBodyClassChips()
    this.patchIframeBodyClasses()
  }

  private renderBodyClassChips(): void {
    this.bodyChipsEl.empty()
    if (this.extraBodyClasses.length === 0) {
      this.bodyChipsEl.createDiv({ cls: 'mv-source-empty', text: 'No extra classes.' })
      return
    }
    for (const c of this.extraBodyClasses) {
      const chip = this.bodyChipsEl.createSpan({ cls: 'mv-bclass-chip' })
      chip.createSpan({ text: c })
      const x = chip.createSpan({ cls: 'mv-bclass-chip-x', text: '×' })
      x.addEventListener('click', () => this.removeExtraBodyClass(c))
    }
  }

  private patchIframeBodyClasses(): void {
    const iframe = this.previewEl.querySelector<HTMLIFrameElement>('iframe')
    if (!iframe || !iframe.contentDocument) return
    const body = iframe.contentDocument.body
    const prev = (body.dataset.mvExtraClasses ?? '').split(' ').filter(Boolean)
    prev.forEach((c) => body.classList.remove(c))
    this.extraBodyClasses.forEach((c) => body.classList.add(c))
    body.dataset.mvExtraClasses = this.extraBodyClasses.join(' ')
  }

  // ────────────────────────────── Render ─────────────────────────────────

  private async render(file: TFile): Promise<void> {
    this.currentFile = file
    if (this.mode === 'source' && this.sourcePanel) {
      void this.loadSourcePanel()
    }
    try {
      const raw = await this.app.vault.read(file)
      const parsed = parseMockup(raw)

      if (this.lastRenderedPath !== file.path) {
        this.currentViewport = parsed.directives.viewport ?? 'desktop'
        this.lastRenderedPath = file.path
      }
      this.updateViewportButtons()
      this.renderBodyClassChips()

      const sourcesRaw = parsed.directives.styles ?? this.plugin.settings.sources
      const adapter = this.app.vault.adapter as unknown as SourceAdapter
      const loadResult = await loadAllSources(adapter, sourcesRaw, this.app.vault.configDir, this.mockupFolder())

      const bodyClasses = [
        ...resolveViewportBodyClasses(this.currentViewport, 'desktop'),
        ...(parsed.directives.bodyClass ?? []),
        ...this.extraBodyClasses,
      ]

      const iframe = createBlankIframe()
      this.clearHost()
      this.previewEl.appendChild(iframe)
      applyViewport(iframe, resolveViewport(this.currentViewport, 'desktop'))

      populateIframe(iframe, {
        body: parsed.body,
        hostClass: parsed.directives.host,
        bodyClasses,
        themeClasses: snapshotThemeClasses(),
        sourceCss: loadResult.css,
        baseUrl: this.app.vault.getResourcePath(file),
        chartJsBundle: typeof __CHART_JS_BUNDLE__ !== 'undefined' ? __CHART_JS_BUNDLE__ : undefined,
        chartBootstrap: CHART_BOOTSTRAP,
        themeTokensCss: snapshotThemeTokens(),
        fontFacesCss: snapshotFontFaces(),
        obsidianStylesheetUrls: this.plugin.settings.obsidianCss
          ? snapshotObsidianStylesheetLinks()
          : undefined,
        obsidianInlineStyles: this.plugin.settings.obsidianCss
          ? snapshotObsidianInlineStyles()
          : undefined,
        shell: parsed.directives.as,
        containerClass: parsed.directives.container,
      })

      if (loadResult.errors.length > 0) {
        const overlay = this.previewEl.createDiv({ cls: 'mockup-viewer-error mockup-viewer-error--overlay' })
        overlay.createDiv({ text: 'Source load issues:' })
        loadResult.errors.forEach((e) => overlay.createDiv({ text: '· ' + e }))
      }
    } catch (err) {
      this.clearHost()
      this.previewEl.createDiv({
        cls: 'mockup-viewer-error',
        text: `Render error: ${(err as Error).message}`,
      })
    }
  }

  private clearHost(): void {
    this.previewEl.empty()
  }

  // ────────────────────────────── Empty states ───────────────────────────

  private showEmptyState(kind: EmptyStateKind): void {
    this.fileSelect.empty()
    this.fileSelect.disabled = true
    const placeholder = this.fileSelect.createEl('option', { text: '—' })
    placeholder.value = ''

    this.clearHost()
    renderEmptyState(this.previewEl, kind, {
      mockupFolder: this.mockupFolder(),
      onAddSource: () => {
        this.setPanelCollapsed(false)
        this.openSourcePicker()
      },
      onCreateBlank: () => void this.createExample(),
      onImportSamples: () => void this.importSamplePack(),
    })

    if (kind === 'no-sources') this.setPanelCollapsed(false)
  }

  private async importSamplePack(): Promise<void> {
    const folder = this.mockupFolder()
    await this.app.vault.adapter.mkdir(folder).catch(() => { /* ignore if exists */ })
    let imported = 0
    let skipped = 0
    for (const [name, content] of SAMPLE_PACK) {
      const path = `${folder}/${name}`
      if (await this.app.vault.adapter.exists(path)) {
        skipped++
        continue
      }
      await this.app.vault.create(path, content)
      imported++
    }
    new Notice(
      `Imported ${imported} sample${imported === 1 ? '' : 's'}` +
      (skipped > 0 ? ` (${skipped} already existed)` : ''),
    )
    this.refreshList()
  }

  private async createExample(): Promise<void> {
    const folder = this.mockupFolder()
    const path = `${folder}/example.html`
    const exists = await this.app.vault.adapter.exists(path)
    if (exists) {
      this.refreshList()
      return
    }
    await this.app.vault.adapter.mkdir(folder).catch(() => { /* ignore if exists */ })
    await this.app.vault.create(path, EXAMPLE_HTML)
    this.refreshList()
  }

  // ────────────────────────────── Mode toggle / SourcePanel ──────────────

  private toggleMode(): void {
    this.setMode(this.mode === 'preview' ? 'source' : 'preview')
  }

  private setMode(next: 'preview' | 'source'): void {
    if (next === this.mode) return
    this.mode = next
    this.previewEl.style.display = next === 'preview' ? '' : 'none'
    this.sourceEl.style.display = next === 'source' ? '' : 'none'
    this.refreshModeToggle()
    if (next === 'source') void this.loadSourcePanel()
  }

  private refreshModeToggle(): void {
    if (!this.modeToggleBtn) return
    this.modeToggleBtn.textContent = this.mode === 'preview' ? 'View source' : 'Back to preview'
  }

  private async loadSourcePanel(): Promise<void> {
    if (!this.currentFile) return
    if (!this.sourcePanel) {
      this.sourcePanel = new SourcePanel(this.sourceEl, {
        writeFile: async (path, content) => {
          await this.app.vault.adapter.write(path, content)
        },
        onSaved: (_kind, _path, _content) => {
          if (this.currentFile) void this.render(this.currentFile)
        },
      })
    }
    const sources = await this.collectResolvedSources()
    this.sourcePanel.setMockup(sources)
  }

  private async isActiveSourceFile(path: string): Promise<boolean> {
    if (!this.currentFile) return false
    const raw = await this.app.vault.read(this.currentFile)
    const parsed = parseMockup(raw)
    const sourcesRaw = parsed.directives.styles ?? this.plugin.settings.sources
    for (const r of sourcesRaw) {
      const s = parseSource(r)
      if (!s) continue
      if (resolveSourcePath(s, this.app.vault.configDir, this.mockupFolder()) === path) return true
    }
    return false
  }

  private async collectResolvedSources(): Promise<ResolvedSource[]> {
    const out: ResolvedSource[] = []
    if (!this.currentFile) return out
    const htmlRaw = await this.app.vault.read(this.currentFile)
    out.push({
      kind: 'html',
      key: 'html',
      path: this.currentFile.path,
      content: htmlRaw,
      editable: true,
    })
    const parsed = parseMockup(htmlRaw)
    const sourcesRaw = parsed.directives.styles ?? this.plugin.settings.sources
    const adapter = this.app.vault.adapter as unknown as SourceAdapter
    for (const raw of sourcesRaw) {
      const s = parseSource(raw)
      if (!s) continue
      try {
        const path = resolveSourcePath(s, this.app.vault.configDir, this.mockupFolder())
        if (!(await adapter.exists(path))) continue
        const content = await adapter.read(path)
        out.push({
          kind: s.kind,
          key: `${s.kind}:${s.ref}`,
          path,
          content,
          editable: isSourceEditable(s.kind),
        })
      } catch { /* skip unreadable source */ }
    }
    return out
  }

  getState(): Record<string, unknown> {
    return { ...super.getState(), mode: this.mode }
  }

  async setState(state: unknown, result: import('obsidian').ViewStateResult): Promise<void> {
    await super.setState(state, result)
    const s = state as { mode?: 'preview' | 'source' } | null
    if (s?.mode && s.mode !== this.mode) {
      queueMicrotask(() => this.setMode(s.mode!))
    }
  }
}
