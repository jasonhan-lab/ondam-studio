const TAX_FREE_THRESHOLD = 150_000;
const INCOME_TAX_RATE_NUMERATOR = 27;
const INCOME_TAX_RATE_DENOMINATOR = 1_000;
const SMALL_COLLECTION_THRESHOLD = 1_000;
const NPS_MONTHLY_INCOME_THRESHOLD = 2_200_000;

function parseWon(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value !== 'string') return null;
  const normalized = value.replaceAll(',', '').trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseFiniteNonNegative(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function exactDecimalFromThousandths(numerator) {
  const whole = numerator / 1_000n;
  const fraction = numerator % 1_000n;
  return Number(fraction === 0n
    ? whole.toString()
    : `${whole}.${fraction.toString().padStart(3, '0')}`);
}

/**
 * Produces an unrounded formula reference only. It deliberately never returns
 * a final withholding tax or net pay because won rounding and payout grouping
 * have not been established by the supplied research handoff.
 */
export function calculateDailyIncomeTax(input) {
  const grossPay = parseWon(input?.grossPay);
  if (grossPay === null) return { canCalculate: false, reason: 'invalid-gross-pay' };
  if (input?.payBasis !== 'pretax') return { canCalculate: false, reason: 'not-pretax' };
  if (input?.payPeriod !== 'daily') return { canCalculate: false, reason: 'not-daily-pay' };

  const nonTaxablePay = parseWon(input?.nonTaxablePay);
  if (nonTaxablePay === null) return { canCalculate: false, reason: 'invalid-non-taxable-pay' };
  if (nonTaxablePay > grossPay) return { canCalculate: false, reason: 'non-taxable-exceeds-gross' };
  if (input?.employmentType !== 'daily-worker') {
    return { canCalculate: false, reason: 'daily-worker-unconfirmed' };
  }
  if (parseFiniteNonNegative(input?.workDays) === null || Number(input.workDays) <= 0) {
    return { canCalculate: false, reason: 'invalid-work-days' };
  }
  if (parseFiniteNonNegative(input?.workHours) === null || Number(input.workHours) <= 0) {
    return { canCalculate: false, reason: 'invalid-work-hours' };
  }

  const taxableDailyPay = grossPay - nonTaxablePay;
  const taxableExcess = Math.max(taxableDailyPay - TAX_FREE_THRESHOLD, 0);
  const formulaNumerator = BigInt(taxableExcess) * BigInt(INCOME_TAX_RATE_NUMERATOR);
  const incomeTaxFormulaValue = exactDecimalFromThousandths(formulaNumerator);

  return {
    canCalculate: true,
    grossDailyPay: grossPay,
    nonTaxableDailyPay: nonTaxablePay,
    taxableDailyPay,
    earnedIncomeDeduction: Math.min(taxableDailyPay, TAX_FREE_THRESHOLD),
    taxableExcess,
    statutoryTaxBeforeCreditFormulaValue: taxableExcess * 0.06,
    earnedIncomeTaxCreditFormulaValue: taxableExcess * 0.06 * 0.55,
    incomeTaxFormulaValue,
    smallCollectionFormulaReference: incomeTaxFormulaValue < SMALL_COLLECTION_THRESHOLD,
    finalWithholdingTax: null,
    finalLocalIncomeTax: null,
    netPay: null,
    finalAmountsStatus: 'withheld-amount-pending-rounding-and-payout-grouping',
  };
}

/**
 * Evaluates only the supplied unrounded formula values for one pay event.
 * The 1,000-won comparison is a reference, not an authoritative final result.
 */
export function assessPayoutGroup(dailyPayments) {
  if (!Array.isArray(dailyPayments) || dailyPayments.length === 0) {
    return { canAssess: false, reason: 'payout-group-required', finalWithholdingTax: null };
  }
  const results = dailyPayments.map(calculateDailyIncomeTax);
  const invalid = results.find((result) => !result.canCalculate);
  if (invalid) return { canAssess: false, reason: invalid.reason, finalWithholdingTax: null };
  const formulaTotal = results.reduce((sum, result) => sum + result.incomeTaxFormulaValue, 0);
  return {
    canAssess: true,
    paymentCount: results.length,
    formulaTotal,
    smallCollectionFormulaReference: formulaTotal < SMALL_COLLECTION_THRESHOLD,
    finalWithholdingTax: null,
    finalAmountsStatus: 'final-withholding-pending-won-rounding-rule',
  };
}

/**
 * A separate preliminary NPS screen based only on the supplied NPS handoff.
 * It is not a definitive enrollment determination or an insurance premium.
 */
export function assessNationalPension(input) {
  const monthsWorked = parseFiniteNonNegative(input?.monthsWorked);
  const monthlyWorkDays = parseFiniteNonNegative(input?.monthlyWorkDays);
  const monthlyWorkHours = parseFiniteNonNegative(input?.monthlyWorkHours);
  const monthlyIncome = parseWon(input?.monthlyIncome);
  const constructionSite = input?.constructionSite;

  if (constructionSite === true) {
    return {
      status: 'review-required',
      reason: 'construction-site-cross-site-aggregation-unverified',
      monthlyCriteria: null,
      premium: null,
    };
  }
  if (constructionSite !== true && constructionSite !== false) {
    return { status: 'review-required', reason: 'construction-site-status-required', monthlyCriteria: null, premium: null };
  }
  if (monthsWorked === null || monthlyWorkDays === null || monthlyWorkHours === null || monthlyIncome === null) {
    return { status: 'review-required', reason: 'nps-inputs-incomplete', monthlyCriteria: null, premium: null };
  }
  if (monthsWorked < 1) {
    return { status: 'not-in-scope-under-supplied-one-month-rule', reason: 'less-than-one-month', monthlyCriteria: false, premium: null };
  }

  const monthlyCriteria = monthlyWorkDays >= 8
    || monthlyWorkHours >= 60
    || monthlyIncome >= NPS_MONTHLY_INCOME_THRESHOLD;
  return {
    status: monthlyCriteria ? 'potentially-applicable-review-required' : 'thresholds-not-met-under-supplied-rule',
    reason: monthlyCriteria ? 'one-month-and-at-least-one-monthly-threshold' : 'monthly-thresholds-not-met',
    monthlyCriteria,
    premium: null,
  };
}

export function assessOtherInsurance() {
  return {
    healthInsurance: { status: 'unverified', premium: null },
    employmentInsurance: { status: 'unverified', premium: null },
    workersCompensation: { status: 'unverified', premium: null },
  };
}

export const payrollConstants = Object.freeze({
  TAX_FREE_THRESHOLD,
  INCOME_TAX_RATE_NUMERATOR,
  INCOME_TAX_RATE_DENOMINATOR,
  SMALL_COLLECTION_THRESHOLD,
  NPS_MONTHLY_INCOME_THRESHOLD,
});
