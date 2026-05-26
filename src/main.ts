import { Plugin, WorkspaceLeaf } from 'obsidian'
import { MOCKUP_VIEW_TYPE, MockupView } from './view'
import { DEFAULT_SETTINGS, MockupViewerSettings } from './settings/settings'
import { MockupViewerSettingTab } from './settings/SettingsTab'

export default class MockupViewerPlugin extends Plugin {
  settings: MockupViewerSettings = { ...DEFAULT_SETTINGS }

  async onload(): Promise<void> {
    await this.loadSettings()
    this.markOwnStyleSheet()

    this.registerView(MOCKUP_VIEW_TYPE, (leaf: WorkspaceLeaf) => new MockupView(leaf, this))

    this.addCommand({
      id: 'open',
      name: 'Open panel',
      callback: () => { void this.activateView() },
    })

    this.addSettingTab(new MockupViewerSettingTab(this.app, this))
  }

  onunload(): void {
    // Per obsidianmd/detach-leaves: leaves are cleaned up by Obsidian on unload;
    // detaching here would reset the leaf's user-chosen location on reload.
  }

  // Obsidian auto-injects this plugin's styles.css as a <style> element in
  // document.head, but the injection timing relative to onload() isn't
  // guaranteed — on plugin reload it's often added AFTER onload returns.
  // We scan once now (covers cold start) and also attach a MutationObserver
  // so we still catch it if it arrives later. Tagging with data-mv="plugin-own"
  // lets iframe stylesheet snapshots skip it via the dataset check instead of
  // re-running the textContent heuristic on every snapshot.
  private markOwnStyleSheet(): void {
    if (this.tagOwnStyleIfPresent(document.head.querySelectorAll('style'))) return
    const observer = new MutationObserver((records) => {
      for (const r of records) {
        const added = Array.from(r.addedNodes).filter(
          (n): n is HTMLStyleElement => n instanceof HTMLStyleElement,
        )
        if (this.tagOwnStyleIfPresent(added)) {
          observer.disconnect()
          return
        }
      }
    })
    observer.observe(document.head, { childList: true })
    this.register(() => observer.disconnect())
  }

  private tagOwnStyleIfPresent(styles: Iterable<HTMLStyleElement>): boolean {
    for (const s of styles) {
      if (s.dataset.mv) continue
      const text = s.textContent ?? ''
      if (text.startsWith('.mockup-viewer-root')) {
        s.setAttribute('data-mv', 'plugin-own')
        return true
      }
    }
    return false
  }

  async loadSettings(): Promise<void> {
    const raw = (await this.loadData()) as Partial<MockupViewerSettings> | null
    this.settings = { ...DEFAULT_SETTINGS, ...(raw ?? {}) }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings)
    this.app.workspace.trigger('mockup-viewer:settings-changed')
  }

  private async activateView(): Promise<void> {
    const { workspace } = this.app
    const existing = workspace.getLeavesOfType(MOCKUP_VIEW_TYPE)
    if (existing.length > 0) {
      void workspace.revealLeaf(existing[0])
      return
    }
    const leaf = workspace.getLeaf('tab')
    await leaf.setViewState({ type: MOCKUP_VIEW_TYPE, active: true })
    void workspace.revealLeaf(leaf)
  }
}
