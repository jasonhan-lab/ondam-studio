import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const robots = await readFile(new URL('./robots.txt', import.meta.url), 'utf8');
const sitemap = await readFile(new URL('./sitemap.xml', import.meta.url), 'utf8');
const siteUrl = 'https://jasonhan-lab.github.io/daypayroll/';
const verificationTag = '<meta name="google-site-verification" content="k7-y3eYS_vqEx5ZjYywdiLgomRIsJFmhpaCGP0wSYyk">';

test('page declares a descriptive Korean title and search snippet matching the calculator', () => {
  assert.match(html, /<title>하루급여 \| 일용근로 급여·원천징수 계산기<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]*하루 세전 급여와 일한 일수[^"]*소득세와 지방소득세[^"]*">/);
});

test('page permits indexing and uses the published URL for canonical and social metadata', () => {
  const head = html.match(/<head>([\s\S]*?)<\/head>/);
  assert.ok(head, 'HTML head is present');
  assert.ok(head[1].includes(verificationTag), 'Google verification meta tag is inside the head');
  assert.match(html, /<meta name="robots" content="index,follow">/);
  assert.match(html, /<meta name="googlebot" content="index,follow">/);
  assert.match(html, /<meta name="Yeti" content="index,follow">/);
  assert.match(html, new RegExp(`<link rel="canonical" href="${siteUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">`));
  assert.match(html, /<meta property="og:title" content="하루급여 \| 일용근로 급여·원천징수 계산기">/);
  assert.match(html, /<meta property="og:description" content="[^"]*일용근로소득 원천징수 예상액[^"]*">/);
  assert.match(html, new RegExp(`<meta property="og:url" content="${siteUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">`));
  assert.match(html, /<meta name="twitter:title" content="하루급여 \| 일용근로 급여·원천징수 계산기">/);
  assert.match(html, /<meta name="twitter:description" content="[^"]*일용근로소득 원천징수 예상액[^"]*">/);
});

test('page provides valid structured data and permits crawler access', () => {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match, 'JSON-LD structured data is present');
  const structuredData = JSON.parse(match[1]);
  assert.equal(structuredData['@type'], 'WebApplication');
  assert.equal(structuredData.name, '하루급여');
  assert.equal(structuredData.url, siteUrl);
  assert.match(robots, /^User-agent: \*\nAllow: \/\n\nSitemap: https:\/\/jasonhan-lab\.github\.io\/daypayroll\/sitemap\.xml\n?$/);
  assert.match(sitemap, /<loc>https:\/\/jasonhan-lab\.github\.io\/daypayroll\/<\/loc>/);
});
