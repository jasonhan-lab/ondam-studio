import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDailyIncomeTax,
  assessPayoutGroup,
  assessNationalPension,
  assessOtherInsurance,
} from './payroll-calculator.mjs';

const valid = (overrides = {}) => ({
  grossPay: '200,000', nonTaxablePay: '0', payBasis: 'pretax', payPeriod: 'daily',
  employmentType: 'daily-worker', workDays: '1', workHours: '8', ...overrides,
});

test('daily pay at 150,000 has zero formula reference and never claims final tax', () => {
  const result = calculateDailyIncomeTax(valid({ grossPay: '150000' }));
  assert.equal(result.incomeTaxFormulaValue, 0);
  assert.equal(result.finalWithholdingTax, null);
  assert.equal(result.netPay, null);
});

test('daily pay at 200,000 gives 1,350 won unrounded formula reference', () => {
  const result = calculateDailyIncomeTax(valid());
  assert.equal(result.incomeTaxFormulaValue, 1_350);
  assert.equal(result.taxableDailyPay, 200_000);
  assert.equal(result.finalLocalIncomeTax, null);
});

test('187,000 daily taxable pay is exactly 999 won before won rounding', () => {
  const result = calculateDailyIncomeTax(valid({ grossPay: '187000' }));
  assert.equal(result.incomeTaxFormulaValue, 999);
  assert.equal(result.smallCollectionFormulaReference, true);
  assert.equal(result.finalWithholdingTax, null);
});

test('non-taxable amount is separated from taxable daily pay', () => {
  const result = calculateDailyIncomeTax(valid({ grossPay: '200000', nonTaxablePay: '50000' }));
  assert.equal(result.taxableDailyPay, 150_000);
  assert.equal(result.incomeTaxFormulaValue, 0);
});

test('non-taxable amount greater than gross pay is rejected', () => {
  assert.equal(calculateDailyIncomeTax(valid({ grossPay: '100000', nonTaxablePay: '100001' })).reason, 'non-taxable-exceeds-gross');
});

test('after-tax, aggregate-period, and non-daily-worker cases do not calculate', () => {
  assert.equal(calculateDailyIncomeTax(valid({ payBasis: 'after-tax' })).reason, 'not-pretax');
  assert.equal(calculateDailyIncomeTax(valid({ payPeriod: 'aggregate' })).reason, 'not-daily-pay');
  assert.equal(calculateDailyIncomeTax(valid({ employmentType: 'other-or-unknown' })).reason, 'daily-worker-unconfirmed');
});

test('invalid, negative, fractional-won, and unsafe gross amounts are rejected', () => {
  for (const grossPay of ['-1', '12.5', 'abc', String(Number.MAX_SAFE_INTEGER + 1)]) {
    assert.equal(calculateDailyIncomeTax(valid({ grossPay })).canCalculate, false);
  }
});

test('payout-group small-collection reference aggregates before comparison', () => {
  const payment = valid({ grossPay: '187000' });
  const group = assessPayoutGroup([payment, payment]);
  assert.equal(group.formulaTotal, 1_998);
  assert.equal(group.smallCollectionFormulaReference, false);
  assert.equal(group.finalWithholdingTax, null);
});

test('missing payout group does not produce a withholding amount', () => {
  assert.equal(assessPayoutGroup([]).finalWithholdingTax, null);
  assert.equal(assessPayoutGroup([]).canAssess, false);
});

test('NPS input values do not imply eligibility while official criteria are unverified', () => {
  const belowPriorThresholds = assessNationalPension({
    monthsWorked: 1, monthlyWorkDays: 7, monthlyWorkHours: 59, monthlyIncome: 2_199_999, constructionSite: false,
  });
  const abovePriorThresholds = assessNationalPension({
    monthsWorked: 1, monthlyWorkDays: 8, monthlyWorkHours: 60, monthlyIncome: 2_200_000, constructionSite: false,
  });

  for (const result of [belowPriorThresholds, abovePriorThresholds]) {
    assert.equal(result.status, 'review-required');
    assert.equal(result.reason, 'official-eligibility-criteria-unverified');
    assert.equal(result.monthlyCriteria, null);
    assert.equal(result.premium, null);
  }
});

test('NPS missing inputs and construction-site cases remain review-only', () => {
  const missing = assessNationalPension({});
  assert.equal(missing.status, 'review-required');
  assert.equal(missing.reason, 'nps-inputs-incomplete');
  assert.equal(missing.premium, null);

  const constructionSite = assessNationalPension({
    monthsWorked: 1, monthlyWorkDays: 8, monthlyWorkHours: 60, monthlyIncome: 2_200_000, constructionSite: true,
  });
  assert.equal(constructionSite.status, 'review-required');
  assert.equal(constructionSite.reason, 'official-eligibility-criteria-unverified');
  assert.equal(constructionSite.premium, null);
});

test('other social insurance remains unverified and has no premium amounts', () => {
  const result = assessOtherInsurance();
  assert.equal(result.healthInsurance.status, 'unverified');
  assert.equal(result.employmentInsurance.status, 'unverified');
  assert.equal(result.workersCompensation.status, 'unverified');
  assert.equal(result.healthInsurance.premium, null);
});
