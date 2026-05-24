# Changelog

All notable changes to Mockup Viewer will be documented in this file.

## [0.0.3] - 2026-05-25

### Changed
- iframe content injection switched to `srcdoc`-driven loading; user inline scripts and the bundled Chart.js run natively without per-element rehydration
- mockup file enumeration now reads the configured folder directly via `getAbstractFileByPath` instead of scanning the whole vault

### Internal
- removed `src/iframe/scripts.ts` (no longer needed)
- both changes are review-driven (community plugin scanner flagged dynamic `<script>` construction and full-vault enumeration)

## [0.0.2] - 2026-05-25

### Fixed
- manifest: removed redundant "Obsidian" word from plugin description (community plugin review requirement)

### Docs
- README slimmed (~205 → 136 lines); moved directive full reference to `docs/directives.md` and Chart.js integration to `docs/charts.md`

## [0.0.1] - 2026-05-24

### Added
- baseline release: render HTML mockups inside an Obsidian view, with the plugin's CSS injected into an isolated iframe
- obsidian-link directive: bring Obsidian's own stylesheets into the iframe
- demo sample pack (hello/chart/svg + obsidian-* examples)
- `SourcePanel` extracted from `MockupView` (file list + source picker)
- syntax highlighter for in-page code blocks (`highlight.js`)
- lint pipeline: `tsc --noEmit`, eslint (with `eslint-plugin-obsidianmd`), stylelint
