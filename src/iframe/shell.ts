import type { ComponentShell } from '../directives'
import { appendCloseIcon, el } from './dom'

// Internal shell layout overrides for iframe-rendered Obsidian components.
// Obsidian's real modals are sized via JS-set CSS variables on the modal
// element. In the iframe none of that runs, so `var(--modal-*)` resolves to
// nothing and the modal collapses to intrinsic size. We restate sensible
// defaults here. Order matters: this stylesheet is injected after the cloned
// Obsidian links but before user `sourceCss`, so plugin CSS can still override.
export const SHELL_OVERRIDE_CSS = `
/* Settings modal sizing — real Obsidian sets these vars via JS on the modal
 * element when opened. In the iframe Obsidian's JS doesn't run, so we restate
 * the exact default values it would have applied. Values verified against a
 * live Obsidian Settings modal (1100px max, 1000px max height). */
.modal.mod-sidebar-layout.mod-settings {
  --modal-width: 90vw;
  --modal-height: 85vh;
  --modal-max-width: 1100px;
  --modal-max-height: 1000px;
}
.modal-container.mod-dim > .modal-bg { opacity: 0.4; }

/* 'view' shell — Obsidian real layout assumes .workspace-leaf is a flex item
 * inside .workspace-tabs. We mount it directly on body, so we manually chain
 * height: 100% down to .view-content. Without this, .view-content collapses
 * to intrinsic content height inside a non-flex body context. */
html body > .workspace-leaf {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.workspace-leaf > .workspace-leaf-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.workspace-leaf-content > .view-content {
  flex: 1;
  min-height: 0;
}

/* 'input-suggest' shell — render input + dropdown stacked inline so mockups
 * see both pieces together. Real Obsidian positions the suggestion-container
 * absolutely below the input via JS portal; we approximate visually. */
.mv-input-suggest-host {
  max-width: 480px;
  margin: 48px auto;
  padding: 0 16px;
}
.mv-input-suggest-input {
  width: 100%;
}
/* 'markdown-view' shell — Obsidian sets --file-line-width on .markdown-preview-view
 * via JS (varies by reading-mode width setting); restate a sensible default so
 * the sizer column centers like the real reading view instead of flowing full-width. */
.markdown-preview-view {
  --file-line-width: 700px;
}
.markdown-preview-view > .markdown-preview-sizer {
  max-width: var(--file-line-width);
  margin: 0 auto;
  padding: 32px 24px;
}

.mv-input-suggest-host > .suggestion-container {
  margin-top: 4px;
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  box-shadow: var(--shadow-s);
  background-color: var(--background-primary);
  max-height: 320px;
  overflow-y: auto;
}
`

/**
 * Build the Obsidian-component scaffolding for the requested shell preset.
 * Returns the element where mockup body content should be injected. The
 * hostClass is placed on the most-relevant scope element for the preset.
 */
export function buildShell(
  doc: Document,
  shell: ComponentShell,
  hostClass?: string,
  containerClass?: string,
): HTMLElement {
  switch (shell) {
    case 'view': {
      // Mirror Obsidian's real ItemView DOM so user content inherits
      // .workspace-leaf-content .view-content { overflow: auto } from app.css.
      // Without this wrapper, content lives directly on body and gets clipped
      // by Obsidian's body { overflow: clip } rule.
      const leaf = el(doc, 'div', 'workspace-leaf')
      const leafContent = el(doc, 'div', 'workspace-leaf-content')
      leafContent.setAttribute('data-type', 'mockup-viewer')
      if (containerClass) leafContent.classList.add(containerClass)
      const viewContent = el(doc, 'div', 'view-content')
      if (hostClass) viewContent.classList.add(hostClass)
      leafContent.appendChild(viewContent)
      leaf.appendChild(leafContent)
      doc.body.appendChild(leaf)
      return viewContent
    }
    case 'modal': {
      const container = el(doc, 'div', 'modal-container mod-dim')
      if (containerClass) container.classList.add(containerClass)
      const bg = el(doc, 'div', 'modal-bg')
      const modal = el(doc, 'div', 'modal mod-scrollable')
      const closeBtn = el(doc, 'div', 'modal-close-button mod-raised clickable-icon')
      appendCloseIcon(doc, closeBtn)
      const header = el(doc, 'div', 'modal-header')
      header.appendChild(el(doc, 'div', 'modal-title'))
      const content = el(doc, 'div', 'modal-content')
      if (hostClass) content.classList.add(hostClass)
      modal.append(closeBtn, header, content)
      container.append(bg, modal)
      doc.body.appendChild(container)
      return content
    }
    case 'settings': {
      const container = el(doc, 'div', 'modal-container mod-settings mod-dim')
      if (containerClass) container.classList.add(containerClass)
      const bg = el(doc, 'div', 'modal-bg')
      // Modal sizing and bg dim handled by SHELL_OVERRIDE_CSS — no inline
      // style here. See the SHELL_OVERRIDE_CSS comment for why.
      const modal = el(doc, 'div', 'modal mod-sidebar-layout mod-settings')
      const closeBtn = el(doc, 'div', 'modal-close-button mod-raised clickable-icon')
      appendCloseIcon(doc, closeBtn)
      // Settings modal is flex-column (close-btn + content stacked). The
      // sidebar must live INSIDE .modal-content so .modal-content can act as
      // the flex-row row for [sidebar | tab-container].
      const modalContent = el(doc, 'div', 'modal-content')
      const sidebar = buildSettingsSidebar(doc)
      const tabContainer = el(doc, 'div', 'vertical-tab-content-container')
      const tab = el(doc, 'div', 'vertical-tab-content')
      if (hostClass) tab.classList.add(hostClass)
      tabContainer.appendChild(tab)
      modalContent.append(sidebar, tabContainer)
      modal.append(closeBtn, modalContent)
      container.append(bg, modal)
      doc.body.appendChild(container)
      return tab
    }
    case 'popover': {
      // Real hover popover nesting: .popover > .markdown-embed > .markdown-embed-content.
      // Inner wrapper provides padding/border that Obsidian preview relies on.
      const wrap = el(doc, 'div', 'popover hover-popover')
      if (containerClass) wrap.classList.add(containerClass)
      const embed = el(doc, 'div', 'markdown-embed')
      const content = el(doc, 'div', 'markdown-embed-content')
      if (hostClass) content.classList.add(hostClass)
      embed.appendChild(content)
      wrap.appendChild(embed)
      doc.body.appendChild(wrap)
      return content
    }
    case 'suggest': {
      const wrap = el(doc, 'div', 'suggestion-container')
      const inner = el(doc, 'div', 'suggestion')
      if (hostClass) inner.classList.add(hostClass)
      wrap.appendChild(inner)
      doc.body.appendChild(wrap)
      return inner
    }
    case 'markdown-view': {
      // MarkdownView reading mode: .markdown-preview-view > .markdown-preview-sizer
      // wraps rendered markdown with max-width centering + pusher spacing.
      const view = el(doc, 'div', 'markdown-preview-view markdown-rendered')
      if (containerClass) view.classList.add(containerClass)
      const sizer = el(doc, 'div', 'markdown-preview-sizer markdown-preview-section')
      if (hostClass) sizer.classList.add(hostClass)
      const pusher = el(doc, 'div', 'markdown-preview-pusher')
      sizer.appendChild(pusher)
      view.appendChild(sizer)
      doc.body.appendChild(view)
      return sizer
    }
    case 'input-suggest': {
      // AbstractInputSuggest: inline dropdown that floats below an input.
      // Real Obsidian positions this absolutely via JS; here we render the
      // input + suggestion list stacked so mockups can see them together.
      const wrap = el(doc, 'div', 'mv-input-suggest-host')
      if (containerClass) wrap.classList.add(containerClass)
      const input = doc.createElement('input')
      input.setAttribute('type', 'text')
      input.setAttribute('placeholder', 'Type to filter…')
      input.className = 'mv-input-suggest-input'
      const container = el(doc, 'div', 'suggestion-container')
      const suggest = el(doc, 'div', 'suggestion')
      if (hostClass) suggest.classList.add(hostClass)
      container.appendChild(suggest)
      wrap.append(input, container)
      doc.body.appendChild(wrap)
      return suggest
    }
  }
}

/**
 * Post-inject decoration: runs after user content has been injected into the
 * shell target. Used for tweaks that need access to user-provided children
 * (which don't exist at buildShell time).
 */
export function decorateShell(shell: ComponentShell, target: HTMLElement): void {
  if (shell === 'suggest' || shell === 'input-suggest') {
    const items = target.querySelectorAll('.suggestion-item')
    const anySelected = Array.from(items).some(i => i.classList.contains('is-selected'))
    if (!anySelected && items.length > 0) items[0].classList.add('is-selected')
  }
}

// Obsidian's settings modal is a flex two-column layout — `.mod-sidebar-layout`
// requires a `.vertical-tab-header` on the left for the content pane to size
// correctly. Without it the content column collapses or overflows. We emit a
// minimal placeholder sidebar with one selected nav item so the shell looks
// like a real Settings tab without forcing every mockup to ship its own.
export function buildSettingsSidebar(doc: Document): HTMLElement {
  const header = el(doc, 'div', 'vertical-tab-header')
  const group = el(doc, 'div', 'vertical-tab-header-group')
  const groupTitle = el(doc, 'div', 'vertical-tab-header-group-title')
  groupTitle.textContent = 'Community plugins'
  const groupItems = el(doc, 'div', 'vertical-tab-header-group-items')
  const navItem = el(doc, 'div', 'vertical-tab-nav-item is-active')
  navItem.textContent = 'Mockup'
  groupItems.appendChild(navItem)
  group.append(groupTitle, groupItems)
  header.appendChild(group)
  return header
}

