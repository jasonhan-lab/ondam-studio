import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const css = await readFile(new URL('./style.css', import.meta.url), 'utf8');

function mediaBlocks(width) {
  const pattern = new RegExp(`@media\\s*\\(max-width:\\s*${width}px\\)\\s*\\{`, 'g');
  const blocks = [];
  let match;
  while ((match = pattern.exec(css))) {
    const opening = css.indexOf('{', match.index);
    let depth = 0;
    let end = opening;
    for (; end < css.length; end += 1) {
      if (css[end] === '{') depth += 1;
      if (css[end] === '}') depth -= 1;
      if (depth === 0) break;
    }
    blocks.push(css.slice(opening + 1, end));
    pattern.lastIndex = end + 1;
  }
  return blocks;
}

test('mobile hero hides the decorative amount card and gives the message full width', () => {
  const blocks = mediaBlocks(760);
  assert.ok(blocks.some(block => /\.hero-art\s*\{[^}]*display\s*:\s*none\s*\}/.test(block)));
  assert.ok(blocks.some(block => /\.hero-copy\s*\{[^}]*max-width\s*:\s*100%\s*\}/.test(block)));
});
