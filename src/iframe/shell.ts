import type { ComponentShell } from '../directives'
import { appendCloseIcon, el } from './dom'

// Internal shell layout overrides for iframe-rendered Obsidian components.
// Obsidian's real modals are sized via JS-set CSS variables on the modal
// element. In the iframe none of that runs, so `var(--modal-*)` resolves to
// nothing and the modal collapses to intrinsic size. We restate sensible
// defaults here. Order matters: this stylesheet is injected after the cloned
// Obsidian links but before user `sourceCss`, so plugin CSS can still override.
export const SHELL_OVERRIDE_CSS = `
.modal.mod-sidebar-layout.mod-settings {
  --modal-width: min(1600px, 90vw);
  --modal-height: min(1080px, 88vh);
  --modal-max-width: 95vw;
  --modal-max-height: 92vh;
}
.modal-container.mod-dim > .modal-bg { opacity: 0.4; }
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
      if (hostClass) doc.body.classList.add(hostClass)
      if (containerClass) doc.body.classList.add(containerClass)
      return doc.body
    }
    case 'modal': {
      const container = el(doc, 'div', 'modal-container mod-dim')
      if (containerClass) container.classList.add(containerClass)
      const bg = el(doc, 'div', 'modal-bg')
      const modal = el(doc, 'div', 'modal')
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
      const wrap = el(doc, 'div', 'popover hover-popover')
      if (hostClass) wrap.classList.add(hostClass)
      doc.body.appendChild(wrap)
      return wrap
    }
    case 'suggest': {
      const wrap = el(doc, 'div', 'suggestion-container')
      const inner = el(doc, 'div', 'suggestion')
      if (hostClass) inner.classList.add(hostClass)
      wrap.appendChild(inner)
      doc.body.appendChild(wrap)
      return inner
    }
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

