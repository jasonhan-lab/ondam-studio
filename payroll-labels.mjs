/** Remove obsolete release/version suffixes from visible interface copy. */
export function removeObsoleteVersionLabel(value) {
  return String(value)
    .replace(/\s*\bV\s*10\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanVisibleText(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest('script, style, noscript, textarea')) continue;
    const cleaned = removeObsoleteVersionLabel(node.nodeValue ?? '');
    if (cleaned !== node.nodeValue) node.nodeValue = cleaned;
  }
}

if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
  cleanVisibleText(document.body);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') {
        const node = record.target;
        if (!node.parentElement?.closest('script, style, noscript, textarea')) {
          const cleaned = removeObsoleteVersionLabel(node.nodeValue ?? '');
          if (cleaned !== node.nodeValue) node.nodeValue = cleaned;
        }
      } else {
        for (const added of record.addedNodes) {
          if (added.nodeType === Node.TEXT_NODE) {
            const cleaned = removeObsoleteVersionLabel(added.nodeValue ?? '');
            if (cleaned !== added.nodeValue) added.nodeValue = cleaned;
          } else if (added.nodeType === Node.ELEMENT_NODE) {
            cleanVisibleText(added);
          }
        }
      }
    }
  });
  observer.observe(document.body, {subtree: true, childList: true, characterData: true});
}
