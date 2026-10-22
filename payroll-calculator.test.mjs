import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDailyIncomeTax } from './payroll-calculator.mjs';

const valid = {
  grossPay: 0,
  nonTaxablePay: 0,
  payBasis: 'pretax',
  payPeriod: 'daily',
  workDays: 1,
  workHours: 8,
  employmentType: 'daily-worker',
};

function formulaFor(grossPay, overrides = {}) {
  return calculateDailyIncomeTax({ ...valid, grossPay, ...overrides });
}

test('confirmed daily-income-tax formula boundary and sample values (before won rounding)', () => {
  for (const [gross, expected] of [[0, 0], [150_000, 0], [200_000, 1_350], [300_000, 4_050]]) {
    const result = formulaFor(gross);
    assert.equal(result.canCalculate, true);
    assert.equal(result.taxableDailyPay, gross);
    assert.equal(result.incomeTaxFormulaValue, expected);
    assert.equal(result.finalTax, null);
    assert.equal(result.netPay, null);
  }
});

test('subtracts separately identified non-taxable pay before applying formula', () => {
  const result = formulaFor(200_000, { nonTaxablePay: 50_000 });
  assert.equal(result.taxableDailyPay, 150_000);
  assert.equal(result.incomeTaxFormulaValue, 0);
});

test('keeps fractional formula values unrounded', () => {
  const result = formulaFor(200_001);
  assert.equal(result.incomeTaxFormulaValue, 1_350.027);
});

test('holds calculation for after-tax amounts and period totals', () => {
  assert.equal(formulaFor(200_000, { payBasis: 'aftertax' }).reason, 'not-pretax');
  assert.equal(formulaFor(200_000, { payPeriod: 'period' }).reason, 'not-daily-pay');
});

test('holds calculation for unconfirmed work type and missing/invalid required values', () => {
  assert.equal(formulaFor(200_000, { employmentType: '' }).reason, 'daily-worker-unconfirmed');
  assert.equal(formulaFor(200_000, { nonTaxablePay: '' }).reason, 'invalid-non-taxable-pay');
  assert.equal(formulaFor(200_000, { workDays: '' }).reason, 'invalid-work-days');
  assert.equal(formulaFor(200_000, { workHours: '' }).reason, 'invalid-work-hours');
  assert.equal(formulaFor('', {}).reason, 'invalid-gross-pay');
});

test('rejects malformed amounts and non-taxable pay above gross', () => {
  assert.equal(formulaFor('1.5').reason, 'invalid-gross-pay');
  assert.equal(formulaFor(100_000, { nonTaxablePay: 100_001 }).reason, 'non-taxable-exceeds-gross');
});
