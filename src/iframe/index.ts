// Public iframe API.
//
// Naming convention:
//   - `extract*`  — pure helpers. All input passed explicitly (no globals,
//                   no `document`). Safe to unit-test under node/jsdom.
//   - `snapshot*` — DOM helpers. Read live state off `document`/`window`.
//                   Browser-only; return empty in non-browser environments.
//
// Internals (`dom.ts`, `scripts.ts`, `shell.ts`, `populate.ts` helpers) are
// NOT exported here — they're implementation details of the iframe build.

export {
  extractCustomProperties,
  buildThemeTokensCss,
  extractThemeClasses,
  snapshotThemeTokens,
  snapshotThemeClasses,
} from './theme'

export {
  extractFontFacesFromSheets,
  snapshotFontFaces,
} from './fonts'

export {
  snapshotObsidianStylesheetLinks,
  snapshotObsidianInlineStyles,
  extractInlineStyleTexts,
} from './obsidian-css'

export type { IframeBuildOpts } from './populate'
export {
  createBlankIframe,
  populateIframe,
} from './populate'
