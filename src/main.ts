import { Plugin, WorkspaceLeaf } from 'obsidian'
import { MOCKUP_VIEW_TYPE, MockupView } from './view'
import { DEFAULT_SETTINGS, MockupViewerSettings } from './settings/settings'
import { MockupViewerSettingTab } from './settings/SettingsTab'

export default class MockupViewerPlugin extends Plugin {
  settings: MockupViewerSettings = { ...DEFAULT_SETTINGS }

  async onload(): Promise<void> {
    await this.loadSettings()

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
