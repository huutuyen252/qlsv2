export interface PrintOptions {
  element: HTMLElement | null;
  title: string;
  filename: string;
  landscape?: boolean;
  onStart?: () => void;
  onSuccess?: () => void;
  onFallback?: (reason: 'sandboxed' | 'error') => void;
}

const PRINT_DOCUMENT_STYLES = (landscape: boolean) => `
  @page {
    size: A4 ${landscape ? 'landscape' : 'portrait'};
    margin: ${landscape ? '14mm' : '20mm 14mm 20mm 35mm'};
  }
  *, *::before, *::after {
    box-sizing: border-box;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: #f1f5f9;
    color: #0f172a;
    font-family: 'Times New Roman', Times, serif;
    font-size: 11.5pt;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 16px;
    background: #ffffff;
    border-bottom: 1px solid #cbd5e1;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .print-toolbar-title {
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
  }
  .print-toolbar-btn {
    padding: 7px 14px;
    border-radius: 4px;
    border: none;
    background: #1d4ed8;
    color: #ffffff;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .print-toolbar-btn:hover {
    background: #1e40af;
  }
  .print-sheet {
    width: ${landscape ? '297mm' : '210mm'};
    min-height: ${landscape ? '210mm' : '297mm'};
    margin: 16px auto;
    padding: ${landscape ? '14mm' : '20mm 14mm 20mm 35mm'};
    background: #ffffff;
    color: #0f172a;
    border: 1px solid #cbd5e1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .report-view-a4 {
    width: 100%;
    padding: 0;
    border: none;
    box-shadow: none;
    min-height: calc(297mm - 40mm);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .report-a4-logo {
    width: 44px;
    height: 44px;
    object-fit: contain;
    flex-shrink: 0;
  }
  .font-serif { font-family: 'Times New Roman', Times, serif; }
  .font-sans { font-family: 'Times New Roman', Times, serif; }
  .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  .tabular-nums { font-variant-numeric: tabular-nums; }
  .uppercase { text-transform: uppercase; }
  .italic { font-style: italic; }
  .underline { text-decoration: underline; }
  .underline-offset-4 { text-underline-offset: 4px; }
  .font-bold, .font-black { font-weight: 700; }
  .font-semibold { font-weight: 600; }
  .font-medium { font-weight: 500; }
  .text-center { text-align: center; }
  .text-left { text-align: left; }
  .text-right { text-align: right; }
  .text-xs { font-size: 11pt; }
  .text-sm { font-size: 12pt; }
  .text-base { font-size: 13pt; }
  .text-lg { font-size: 14pt; }
  .text-xl { font-size: 16pt; }
  .text-2xl { font-size: 18pt; }
  .text-\\[9pt\\] { font-size: 9pt; }
  .text-\\[9\\.5pt\\] { font-size: 9.5pt; }
  .text-\\[10pt\\] { font-size: 10pt; }
  .text-\\[10\\.5pt\\] { font-size: 10.5pt; }
  .text-\\[11pt\\] { font-size: 11pt; }
  .text-\\[11\\.5pt\\] { font-size: 11.5pt; }
  .text-\\[10px\\] { font-size: 10px; }
  .text-\\[11px\\] { font-size: 11px; }
  .text-\\[11\\.5px\\] { font-size: 11.5px; }
  .text-\\[9px\\] { font-size: 9px; }
  .text-\\[8px\\] { font-size: 8px; }
  .leading-snug { line-height: 1.35; }
  .leading-relaxed { line-height: 1.5; }
  .tracking-tight { letter-spacing: -0.01em; }
  .tracking-wide { letter-spacing: 0.025em; }
  .grid { display: grid; }
  .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }
  .col-span-6 { grid-column: span 6 / span 6; }
  .flex { display: flex; }
  .flex-col { flex-direction: column; }
  .items-start { align-items: flex-start; }
  .items-center { align-items: center; }
  .items-end { align-items: flex-end; }
  .justify-between { justify-content: space-between; }
  .shrink-0 { flex-shrink: 0; }
  .min-w-0 { min-width: 0; }
  .gap-2 { gap: 8px; }
  .gap-2\\.5 { gap: 10px; }
  .gap-3 { gap: 12px; }
  .gap-4 { gap: 16px; }
  .gap-6 { gap: 24px; }
  .space-y-1 > * + * { margin-top: 4px; }
  .space-y-2 > * + * { margin-top: 8px; }
  .space-y-3 > * + * { margin-top: 12px; }
  .space-y-4 > * + * { margin-top: 16px; }
  .space-y-5 > * + * { margin-top: 20px; }
  .space-y-6 > * + * { margin-top: 24px; }
  .mt-0\\.5 { margin-top: 2px; }
  .mt-1 { margin-top: 4px; }
  .mt-1\\.5 { margin-top: 6px; }
  .mt-2 { margin-top: 8px; }
  .mt-6 { margin-top: 24px; }
  .mt-8 { margin-top: 32px; }
  .p-0\\.5 { padding: 2px; }
  .p-1 { padding: 4px; }
  .p-1\\.5 { padding: 6px; }
  .p-2 { padding: 8px; }
  .p-2\\.5 { padding: 10px; }
  .p-3 { padding: 12px; }
  .p-4 { padding: 16px; }
  .py-1\\.5 { padding-top: 6px; padding-bottom: 6px; }
  .py-2 { padding-top: 8px; padding-bottom: 8px; }
  .py-5 { padding-top: 18px; padding-bottom: 18px; }
  .py-6 { padding-top: 20px; padding-bottom: 20px; }
  .px-2\\.5 { padding-left: 10px; padding-right: 10px; }
  .px-3 { padding-left: 12px; padding-right: 12px; }
  .pt-1 { padding-top: 4px; }
  .pt-2 { padding-top: 8px; }
  .pt-2\\.5 { padding-top: 10px; }
  .pt-3 { padding-top: 12px; }
  .pt-4 { padding-top: 16px; }
  .pt-6 { padding-top: 24px; }
  .pt-8 { padding-top: 32px; }
  .pt-10 { padding-top: 32px; }
  .pb-1 { padding-bottom: 4px; }
  .pb-3 { padding-bottom: 12px; }
  .pb-4 { padding-bottom: 16px; }
  .pb-6 { padding-bottom: 20px; }
  .h-12 { height: 48px; }
  .h-16 { height: 64px; }
  .h-20 { height: 80px; }
  .border { border: 1px solid #cbd5e1; }
  .border-t { border-top: 1px solid #cbd5e1; }
  .border-b { border-bottom: 1px solid #cbd5e1; }
  .border-slate-400 { border-color: #94a3b8; }
  .border-r { border-right: 1px solid #cbd5e1; }
  .border-x { border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; }
  .break-inside-avoid { page-break-inside: avoid; break-inside: avoid; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 6px;
  }
  th, td {
    border: 1px solid #334155 !important;
    padding: 6px 8px;
    color: #0f172a !important;
    vertical-align: middle;
  }
  th {
    background-color: #f1f5f9 !important;
    font-weight: 700;
  }
  tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  p, h1, h2, h3, h4 {
    margin: 0;
  }
  .text-rose-700, .text-rose-800 { color: #b91c1c !important; }
  .text-emerald-700, .text-emerald-950 { color: #15803d !important; }
  .text-blue-700, .text-blue-800, .text-blue-900 { color: #1d4ed8 !important; }
  .text-amber-800, .text-amber-900 { color: #92400e !important; }
  .bg-amber-50, .bg-amber-100 { background-color: #fef3c7 !important; }
  .bg-emerald-50 { background-color: #ecfdf5 !important; }
  .bg-green-300 { background-color: #bbf7d0 !important; }
  .bg-blue-50\\/60 { background-color: #eff6ff !important; }
  @media print {
    html, body {
      background: #ffffff !important;
    }
    .print-toolbar, .no-print, button {
      display: none !important;
    }
    .print-sheet, .report-view-a4 {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      min-height: auto !important;
      border: none !important;
    }
  }
`;

function inlineLoadedImages(originalElement: HTMLElement, cloneElement: HTMLElement): void {
  const originalImages = Array.from(originalElement.querySelectorAll('img'));
  const clonedImages = Array.from(cloneElement.querySelectorAll('img'));

  originalImages.forEach((origImg, index) => {
    const cloneImg = clonedImages[index];
    if (!cloneImg) return;
    try {
      if (origImg.complete && origImg.naturalWidth > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = origImg.naturalWidth;
        canvas.height = origImg.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(origImg, 0, 0);
          cloneImg.src = canvas.toDataURL('image/png');
          return;
        }
      }
      cloneImg.src = origImg.src;
    } catch {
      cloneImg.src = origImg.src;
    }
  });
}

function buildPrintableHtmlDocument(element: HTMLElement, title: string, landscape = false): string {
  const clone = element.cloneNode(true) as HTMLElement;
  inlineLoadedImages(element, clone);
  clone.querySelectorAll('.no-print, .btn-print-hide, button').forEach((el) => el.remove());

  const escapedTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedTitle}</title>
  <style>${PRINT_DOCUMENT_STYLES(landscape)}</style>
</head>
<body>
  <div class="print-toolbar no-print">
    <span class="print-toolbar-title">${escapedTitle}</span>
    <button type="button" class="print-toolbar-btn" onclick="window.print()">In / Lưu PDF (Ctrl+P)</button>
  </div>
  <div class="print-sheet">${clone.outerHTML}</div>
</body>
</html>`;
}

export function downloadPrintableHtml(
  element: HTMLElement | null,
  options: { title: string; filename: string; landscape?: boolean }
): boolean {
  if (!element) return false;
  const html = buildPrintableHtmlDocument(element, options.title, Boolean(options.landscape));
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = options.filename.endsWith('.html') ? options.filename : `${options.filename}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export function triggerPrintWithFallback({
  element,
  title,
  filename,
  landscape = false,
  onStart,
  onSuccess,
  onFallback,
}: PrintOptions): void {
  onStart?.();
  let didTriggerBeforePrint = false;
  const handleBeforePrint = () => {
    didTriggerBeforePrint = true;
  };

  window.addEventListener('beforeprint', handleBeforePrint, { once: true });
  const start = performance.now();

  try {
    window.print();
  } catch {
    window.removeEventListener('beforeprint', handleBeforePrint);
    if (element) {
      downloadPrintableHtml(element, { title, filename, landscape });
    }
    onFallback?.('error');
    return;
  }

  const elapsed = performance.now() - start;

  // In sandboxed iframes without `allow-modals`, Chrome ignores `window.print()` immediately
  // (< ~100ms) and never dispatches `beforeprint`.
  window.setTimeout(() => {
    window.removeEventListener('beforeprint', handleBeforePrint);
    if (didTriggerBeforePrint || elapsed >= 150) {
      onSuccess?.();
      return;
    }
    if (element) {
      downloadPrintableHtml(element, { title, filename, landscape });
    }
    onFallback?.('sandboxed');
  }, 180);
}
