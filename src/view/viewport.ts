import type { Viewport } from '../directives'

export function applyViewport(iframe: HTMLIFrameElement, viewport: Viewport): void {
  if (viewport.width === null || viewport.height === null) {
    iframe.removeClass('mockup-viewer-frame')
    iframe.addClass('mockup-viewer-frame--full')
    iframe.setCssProps({
      '--mv-frame-width': '',
      '--mv-frame-height': '',
    })
    return
  }

  iframe.removeClass('mockup-viewer-frame--full')
  iframe.addClass('mockup-viewer-frame')
  iframe.setCssProps({
    '--mv-frame-width': `${viewport.width}px`,
    '--mv-frame-height': `${viewport.height}px`,
  })
}
