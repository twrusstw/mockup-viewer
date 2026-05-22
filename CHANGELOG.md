# Changelog

All notable changes to Mockup Viewer will be documented in this file.

## [0.0.1] - 2026-05-24

### Added
- baseline release: render HTML mockups inside an Obsidian view, with the plugin's CSS injected into an isolated iframe
- obsidian-link directive: bring Obsidian's own stylesheets into the iframe
- demo sample pack (hello/chart/svg + obsidian-* examples)
- `SourcePanel` extracted from `MockupView` (file list + source picker)
- syntax highlighter for in-page code blocks (`highlight.js`)
- lint pipeline: `tsc --noEmit`, eslint (with `eslint-plugin-obsidianmd`), stylelint
