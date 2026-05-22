// Bundled sample mockups and Chart.js bootstrap. The `__SAMPLE_*` globals are
// inlined at build time by esbuild's `define` (see esbuild.config.mjs); the
// `declare const` blocks below are TypeScript shims so this module compiles
// without referencing globalThis.

declare const __SAMPLE_HELLO__: string
declare const __SAMPLE_WITH_CHART__: string
declare const __SAMPLE_WITH_SVG__: string
declare const __SAMPLE_OBSIDIAN_SETTINGS__: string
declare const __SAMPLE_OBSIDIAN_SUGGEST__: string
declare const __SAMPLE_OBSIDIAN_PROMPT__: string
declare const __SAMPLE_OBSIDIAN_NOTICE__: string

export const SAMPLE_PACK: Array<[string, string]> = [
  ['hello.html', __SAMPLE_HELLO__],
  ['with-chart.html', __SAMPLE_WITH_CHART__],
  ['with-svg.html', __SAMPLE_WITH_SVG__],
  ['obsidian-settings-tab.html', __SAMPLE_OBSIDIAN_SETTINGS__],
  ['obsidian-suggest-modal.html', __SAMPLE_OBSIDIAN_SUGGEST__],
  ['obsidian-prompt-modal.html', __SAMPLE_OBSIDIAN_PROMPT__],
  ['obsidian-notice.html', __SAMPLE_OBSIDIAN_NOTICE__],
]

// Two ways for a mockup to render Chart.js charts:
//   1. Simple path: <canvas data-chart-config='{"type":"bar", "data":{...}}'></canvas>
//      → this bootstrap auto-wires them. JSON only, no function callbacks.
//   2. Advanced path: write an inline <script> after the canvas and call
//      new Chart(canvas, fullConfig) yourself. Needed when you want
//      formatter / callback functions (tick labels, datalabels, custom colors
//      from CSS variables). The iframe rehydrates user scripts so they run.
export const CHART_BOOTSTRAP = `
;(function () {
  if (typeof Chart === 'undefined') return;
  document.querySelectorAll('canvas[data-chart-config]').forEach(function (c) {
    try {
      var cfg = JSON.parse(c.getAttribute('data-chart-config'));
      new Chart(c, cfg);
    } catch (err) {
      console.error('[mockup-viewer] chart render failed', err);
    }
  });
})();
`

export const EXAMPLE_HTML = `<!-- title:  -->
<!-- viewport: desktop -->
<div>

</div>
`
