const TAX_FREE_THRESHOLD = 150_000;
// 6% withholding after a 55% earned-income tax credit is exactly 27/1000.
const INCOME_TAX_NUMERATOR = 27;
const INCOME_TAX_DENOMINATOR = 1_000;

function parseNonNegativeInteger(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value !== 'string') return null;
  const normalized = value.replaceAll(',', '').trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parsePositiveNumber(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Calculates only the unrounded daily income-tax formula value.
 * This is not a final withholding amount or net-pay calculator.
 */
export function calculateDailyIncomeTax(input) {
  const amount = parseNonNegativeInteger(input?.grossPay);
  if (amount === null) return { canCalculate: false, reason: 'invalid-gross-pay' };
  if (input?.payBasis !== 'pretax') return { canCalculate: false, reason: 'not-pretax' };
  if (input?.payPeriod !== 'daily') return { canCalculate: false, reason: 'not-daily-pay' };

  const nonTaxable = parseNonNegativeInteger(input?.nonTaxablePay);
  if (nonTaxable === null) return { canCalculate: false, reason: 'invalid-non-taxable-pay' };
  if (nonTaxable > amount) return { canCalculate: false, reason: 'non-taxable-exceeds-gross' };
  if (input?.employmentType !== 'daily-worker') {
    return { canCalculate: false, reason: 'daily-worker-unconfirmed' };
  }
  if (parsePositiveNumber(input?.workDays) === null) {
    return { canCalculate: false, reason: 'invalid-work-days' };
  }
  if (parsePositiveNumber(input?.workHours) === null) {
    return { canCalculate: false, reason: 'invalid-work-hours' };
  }

  const taxableDailyPay = amount - nonTaxable;
  const taxableExcess = Math.max(taxableDailyPay - TAX_FREE_THRESHOLD, 0);
  const taxBeforeWonRounding = (taxableExcess * INCOME_TAX_NUMERATOR)
    / INCOME_TAX_DENOMINATOR;

  return {
    canCalculate: true,
    grossDailyPay: amount,
    nonTaxableDailyPay: nonTaxable,
    taxableDailyPay,
    incomeTaxFormulaValue: taxBeforeWonRounding,
    finalTax: null,
    netPay: null,
  };
}
