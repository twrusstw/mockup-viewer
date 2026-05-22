import { App, PluginSettingTab, Setting } from 'obsidian'
import type MockupViewerPlugin from '../main'

export class MockupViewerSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: MockupViewerPlugin) {
    super(app, plugin)
  }

  display(): void {
    const { containerEl } = this
    containerEl.empty()

    new Setting(containerEl)
      .setName('Inject Obsidian app.css into iframe')
      .setDesc(
        'Mirror the host theme/snippets into the mockup iframe via <link> tags. ' +
          'Desktop-only; turn off if Obsidian changes its stylesheet protocol and mockups break.',
      )
      .addToggle((t) =>
        t.setValue(this.plugin.settings.obsidianCss).onChange(async (v) => {
          this.plugin.settings.obsidianCss = v
          await this.plugin.saveSettings()
        }),
      )
  }
}
