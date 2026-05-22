export interface MockupViewerSettings {
  sources: string[]
  mockupFolder: string
  obsidianCss: boolean
}

export const DEFAULT_SETTINGS: MockupViewerSettings = {
  sources: [],
  mockupFolder: 'Mockup',
  obsidianCss: true,
}
