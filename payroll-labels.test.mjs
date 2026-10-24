import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {removeObsoleteVersionLabel} from './payroll-labels.mjs';

const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');

test('removes obsolete V10 suffixes without changing the surrounding Korean label', () => {
  assert.equal(removeObsoleteVersionLabel('근로자 기본 공제 V10'), '근로자 기본 공제');
  assert.equal(removeObsoleteVersionLabel('공제 후 얼마인가요 옆에 근로자 기본 공제 V10 있어요'), '공제 후 얼마인가요 옆에 근로자 기본 공제 있어요');
});

test('handles spacing and casing variants, including a leading version label', () => {
  assert.equal(removeObsoleteVersionLabel('기본 공제 v 10'), '기본 공제');
  assert.equal(removeObsoleteVersionLabel('기본 공제 V 10'), '기본 공제');
  assert.equal(removeObsoleteVersionLabel('V10 공제'), '공제');
  assert.equal(removeObsoleteVersionLabel('v 10 공제'), '공제');
});

test('preserves unrelated numbers and visible input-like values', () => {
  assert.equal(removeObsoleteVersionLabel('근무 10일 · 급여 200,000원'), '근무 10일 · 급여 200,000원');
  assert.equal(removeObsoleteVersionLabel('입력값 10 / 금액 1,234,567원'), '입력값 10 / 금액 1,234,567원');
});

test('external cleanup module is connected without adding inline JavaScript', () => {
  assert.match(html, /<script type="module" src="\.\/payroll-labels\.mjs"><\/script>/);
  assert.doesNotMatch(html, /<script\s+type="module">/i);
});
