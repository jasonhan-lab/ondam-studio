import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');

test('page declares a descriptive Korean title and search snippet matching the calculator', () => {
  assert.match(html, /<title>하루급여 \| 일용근로 급여·원천징수 계산기<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]*하루 세전 급여와 일한 일수[^"]*소득세와 지방소득세[^"]*">/);
});

test('page permits indexing and provides social sharing metadata without inventing a canonical domain', () => {
  assert.match(html, /<meta name="robots" content="index,follow">/);
  assert.match(html, /<meta name="googlebot" content="index,follow">/);
  assert.match(html, /<meta property="og:title" content="하루급여 \| 일용근로 급여·원천징수 계산기">/);
  assert.match(html, /<meta property="og:description" content="[^"]*일용근로소득 원천징수 예상액[^"]*">/);
  assert.doesNotMatch(html, /<link rel="canonical"/i);
});
