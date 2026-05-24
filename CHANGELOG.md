# Changelog

All notable changes to Mockup Viewer will be documented in this file.

## [0.0.3] - 2026-05-25

### Added
- 2 new shell presets aligned to Obsidian plugin API classes: `markdown-view` (mirrors `MarkdownView` reading mode) and `input-suggest` (mirrors `AbstractInputSuggest` inline dropdown)
- `decorateShell` hook in `src/iframe/shell.ts` for post-inject tweaks (used by `suggest` and `input-suggest` to auto-mark the first `.suggestion-item` as `.is-selected`)
- shell scope rewritten around the Obsidian API class a plugin developer extends: the 7 presets `view` / `markdown-view` / `modal` / `suggest` / `settings` / `popover` / `input-suggest` map 1:1 onto `ItemView` / `MarkdownView` / `Modal` / `SuggestModal` / `PluginSettingTab` / `HoverPopover` / `AbstractInputSuggest`

### Fixed
- `view` shell now wraps user content in `.workspace-leaf-content > .view-content`, the real Obsidian scroll container. Previously content lived directly on `body`, which Obsidian's `body { overflow: clip }` rule clipped — chart axis labels and any content beyond the iframe viewport were unreachable
- `modal` shell adds `mod-scrollable` so long modal content can scroll inside `.modal-content` instead of being clipped
- `settings` shell width: replaced the previous `min(1600px, 90vw)` override with Obsidian's actual default values (`--modal-max-width: 1100px`, `--modal-max-height: 1000px`) so the modal renders at the same dimensions as the live Settings UI
- `popover` shell now mirrors real `.popover > .markdown-embed > .markdown-embed-content` nesting so inner padding/border inherits correctly

### Changed
- iframe content injection switched to `srcdoc`-driven loading; user inline scripts and the bundled Chart.js run natively without per-element rehydration
- mockup file enumeration now reads the configured folder directly via `getAbstractFileByPath` instead of scanning the whole vault
- `view` shell DOM change introduces a small visual difference: user content now inherits `.view-content`'s default padding/margin from Obsidian's app.css. Mockups that previously assumed body-direct rendering may need minor padding adjustment

### Renamed
- mockup files standardized under `<shell>-demo.html`: `with-chart.html` content folded into `hello.html`, `obsidian-prompt-modal.html` → `modal-demo.html`, `obsidian-settings-tab.html` → `settings-demo.html`, `obsidian-suggest-modal.html` → `suggest-demo.html`. `hello.html` kept as the intro example
- all demo content rewritten as generic Obsidian-flavoured samples (release notes / quick switcher / file picker) so the bundled sample pack is project-neutral
- `markdown-view` shell adds default `--file-line-width: 700px` + auto-centered `.markdown-preview-sizer` so reading mode looks like Obsidian's centered narrow column instead of left-aligned full-width

### Internal
- removed `src/iframe/scripts.ts` (no longer needed)
- review-driven changes: community plugin scanner flagged dynamic `<script>` construction (now via `srcdoc` string-concat) and full-vault enumeration (now folder-scoped)
- bundled sample-pack sources moved from `mockup-vault/Mockup/` to `samples/` so the dev QA vault can be wiped without losing the bundle source
- added `scripts/reset-vault.sh` to wipe the dev vault back to first-install state (empty `Mockup/` + default `data.json`) for testing the empty-state flow

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
