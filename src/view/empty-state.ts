// Empty-state cards shown in the preview area when there are no sources yet
// or no .html mockups under the configured folder.

export type EmptyStateKind = 'no-sources' | 'no-files'

export interface EmptyStateOpts {
  mockupFolder: string
  onAddSource: () => void
  onCreateBlank: () => void
  onImportSamples: () => void
}

export function renderEmptyState(host: HTMLElement, kind: EmptyStateKind, opts: EmptyStateOpts): void {
  const card = host.createDiv({ cls: 'mockup-viewer-empty' })

  if (kind === 'no-sources') {
    card.createEl('h3', { text: 'Get started' })
    const list = card.createEl('ol', { cls: 'mockup-viewer-empty-list' })
    const li1 = list.createEl('li')
    li1.createSpan({ text: "Add at least one stylesheet source (your plugin's stylesheet, a vault CSS file, or an Obsidian snippet)." })

    const li2 = list.createEl('li')
    li2.createSpan({ text: 'Put your HTML mockup files under ' })
    li2.createEl('code', { text: `${opts.mockupFolder}/` })
    li2.createSpan({ text: ' in this vault. Change the folder in the panel if you want a different one.' })

    const btn = card.createEl('button', { text: 'Add source', cls: 'mod-cta' })
    btn.addEventListener('click', () => opts.onAddSource())
    return
  }

  card.createEl('h3', { text: `No .html files in ${opts.mockupFolder}/` })
  card.createEl('p', {
    text: 'Create a blank starter file, or import the bundled sample pack ' +
      '(chart + SVG demos) to see what mockups can look like.',
  })
  const row = card.createDiv({ cls: 'mockup-viewer-empty-actions' })
  const blank = row.createEl('button', { text: 'Create blank', cls: 'mod-cta' })
  blank.addEventListener('click', () => opts.onCreateBlank())
  const imp = row.createEl('button', { text: 'Import sample pack' })
  imp.addEventListener('click', () => opts.onImportSamples())
}
