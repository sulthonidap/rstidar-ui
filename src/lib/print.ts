/**
 * Prints just `el` (not the page behind a dialog) by copying it, with the app's
 * stylesheets, into a hidden iframe and printing that. `pageCss` sets paper size etc.
 */
export function printElement(el: HTMLElement, pageCss: string, title = document.title) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }

  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join('');
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>` +
      `<base href="${location.origin}/">${styles}<style>${pageCss}</style></head>` +
      `<body>${el.outerHTML}</body></html>`,
  );
  doc.close();

  // Wait for stylesheets, images (logo) and fonts, otherwise the print can come out unstyled.
  const pending: Promise<unknown>[] = [
    ...Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).map(
      (link) =>
        new Promise((resolve) => {
          link.addEventListener('load', resolve, { once: true });
          link.addEventListener('error', resolve, { once: true });
        }),
    ),
    ...Array.from(doc.images)
      .filter((img) => !img.complete)
      .map((img) => new Promise((resolve) => (img.onload = img.onerror = resolve))),
  ];

  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  win.addEventListener('afterprint', cleanup, { once: true });

  Promise.all(pending)
    .then(() => doc.fonts?.ready)
    .then(() => {
      win.focus();
      win.print();
    });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}
