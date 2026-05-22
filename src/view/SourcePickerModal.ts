import { App, Modal, Setting } from 'obsidian'
import type { SourceKind } from '../sources'

interface PluginRegistry {
  manifests: Record<string, { name?: string; id: string }>
  enabledPlugins: Set<string>
}

export class SourcePickerModal extends Modal {
  private kind: SourceKind = 'plugin'
  private ref = ''
  private refContainer!: HTMLElement
  private submitted = false

  constructor(app: App, private onSubmit: (raw: string | null) => void) {
    super(app)
  }

  onOpen(): void {
    this.titleEl.setText('Add stylesheet source')
    const { contentEl } = this
    contentEl.empty()

    new Setting(contentEl)
      .setName('Source kind')
      .setDesc(`plugin: another plugin's styles.css · vault: a CSS file in your workspace folder · snippet: a ${this.app.vault.configDir}/snippets/*.css file`)
      .addDropdown((dd) => {
        dd.addOptions({ plugin: 'Plugin', vault: 'Vault file', snippet: 'Snippet' })
          .setValue(this.kind)
          .onChange((v) => {
            this.kind = v as SourceKind
            this.ref = ''
            this.renderRefInput()
          })
      })

    this.refContainer = contentEl.createDiv()
    this.renderRefInput()

    const buttonRow = new Setting(contentEl)
    buttonRow.addButton((b) =>
      b.setButtonText('Cancel').onClick(() => {
        this.close()
      }),
    )
    buttonRow.addButton((b) =>
      b
        .setButtonText('Add')
        .setCta()
        .onClick(() => {
          const trimmed = this.ref.trim()
          if (!trimmed) return
          this.submitted = true
          this.onSubmit(`${this.kind}:${trimmed}`)
          this.close()
        }),
    )
  }

  onClose(): void {
    if (!this.submitted) this.onSubmit(null)
    this.contentEl.empty()
  }

  private renderRefInput(): void {
    this.refContainer.empty()

    if (this.kind === 'plugin') {
      const pluginIds = this.listEnabledPluginIds()
      new Setting(this.refContainer)
        .setName('Plugin')
        .setDesc('Only currently enabled plugins are listed.')
        .addDropdown((dd) => {
          dd.addOption('', '— select —')
          pluginIds.forEach((id) => { dd.addOption(id, id) })
          dd.setValue(this.ref).onChange((v) => {
            this.ref = v
          })
        })
      return
    }

    if (this.kind === 'snippet') {
      void this.populateSnippetDropdown()
      return
    }

    // vault
    new Setting(this.refContainer)
      .setName('Vault path')
      .setDesc('CSS file path relative to your workspace folder (e.g. draft.css). Prefix with / to escape to vault root.')
      .addText((t) => {
        t.setPlaceholder('Path to CSS file').onChange((v) => {
          this.ref = v
        })
      })
  }

  private listEnabledPluginIds(): string[] {
    const plugins = (this.app as unknown as { plugins: PluginRegistry }).plugins
    if (!plugins) return []
    return Array.from(plugins.enabledPlugins).sort()
  }

  private async populateSnippetDropdown(): Promise<void> {
    const list = await this.listSnippets()
    new Setting(this.refContainer)
      .setName('Snippet')
      .setDesc(`CSS snippets under ${this.app.vault.configDir}/snippets/.`)
      .addDropdown((dd) => {
        dd.addOption('', '— select —')
        list.forEach((name) => { dd.addOption(name, name) })
        dd.setValue(this.ref).onChange((v) => {
          this.ref = v
        })
      })
  }

  private async listSnippets(): Promise<string[]> {
    const adapter = this.app.vault.adapter
    const dir = `${this.app.vault.configDir}/snippets`
    try {
      if (!(await adapter.exists(dir))) return []
      const listing = await adapter.list(dir)
      return listing.files
        .filter((f) => f.endsWith('.css'))
        .map((f) => f.slice(dir.length + 1).replace(/\.css$/, ''))
        .sort()
    } catch {
      return []
    }
  }
}
