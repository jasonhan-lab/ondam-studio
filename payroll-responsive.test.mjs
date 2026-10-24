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

test('STEP 02 result and deduction containers may shrink inside mobile cards', () => {
  assert.match(css, /\.result-card,\.take-home,\.deduction-list,\.deduction-row\s*\{[^}]*min-width\s*:\s*0/);
});

test('long calculated amounts can wrap instead of being clipped on narrow screens', () => {
  assert.match(css, /\.deduction-row>strong\s*\{[^}]*white-space\s*:\s*normal/);
  assert.match(css, /\.deduction-row>strong\s*\{[^}]*overflow-wrap\s*:\s*anywhere/);
  assert.match(css, /@media\s*\(max-width:\s*650px\)[^{]*\{[^}]*\.take-home>strong\s*\{[^}]*overflow-wrap\s*:\s*anywhere/);
});

test('mobile deduction rows use a bounded value column and allow labels and amounts to wrap', () => {
  const blocks = mediaBlocks(650);
  assert.ok(blocks.some(block => /\.deduction-row\s*\{[^}]*display\s*:\s*grid/.test(block)));
  assert.ok(blocks.some(block => /\.deduction-row\s*\{[^}]*grid-template-columns\s*:\s*minmax\(0,1fr\)\s+minmax\(0,40%\)/.test(block)));
  assert.ok(blocks.some(block => /\.deduction-row>strong\s*\{[^}]*white-space\s*:\s*normal/.test(block)));
  assert.ok(blocks.some(block => /\.deduction-row>strong\s*\{[^}]*overflow-wrap\s*:\s*anywhere/.test(block)));
});
