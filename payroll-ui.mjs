import { calculateDailyIncomeTax } from './payroll-calculator.mjs';

const byId = (id) => document.getElementById(id);
const controls = [
  'gross-pay', 'non-taxable-pay', 'pay-basis', 'pay-period',
  'work-days', 'work-hours', 'employment-type',
].map(byId);
const button = byId('calculate-button');
const status = byId('calculation-status');
const amountFormat = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });

function render() {
  const result = calculateDailyIncomeTax({
    grossPay: byId('gross-pay').value,
    nonTaxablePay: byId('non-taxable-pay').value,
    payBasis: byId('pay-basis').value,
    payPeriod: byId('pay-period').value,
    workDays: byId('work-days').value,
    workHours: byId('work-hours').value,
    employmentType: byId('employment-type').value,
  });

  byId('net-pay-value').textContent = '계산 보류';
  byId('gross-result').textContent = '—';
  byId('taxable-result').textContent = '—';
  byId('income-tax-result').textContent = '—';
  button.disabled = !result.canCalculate;
  button.classList.toggle('button-disabled', !result.canCalculate);

  if (result.canCalculate) {
    byId('gross-result').textContent = `${amountFormat.format(result.grossDailyPay)}원`;
    byId('taxable-result').textContent = `${amountFormat.format(result.taxableDailyPay)}원`;
    byId('income-tax-result').textContent = `${String(result.incomeTaxFormulaValue)}원 (반올림 전)`;
    status.innerHTML = '<strong>소득세 산식 참고값입니다.</strong> 1일 과세대상 급여에 공식을 적용한 값이며, 원 단위 처리·지방소득세·보험료를 포함한 확정 세액이나 실수령액이 아닙니다.';
    return;
  }

  const messages = {
    'invalid-gross-pay': '급여 총액을 0 이상의 원 단위 숫자로 입력해 주세요.',
    'not-pretax': '세전 금액 기준을 선택해야 합니다. 세후 금액은 역산하지 않습니다.',
    'not-daily-pay': '기간 총액만으로 일별 급여를 배분할 수 없어 계산을 보류합니다.',
    'invalid-non-taxable-pay': '1일 비과세 급여를 구분해 입력해 주세요. 비과세액이 없으면 0을 입력하세요.',
    'non-taxable-exceeds-gross': '비과세 급여는 1일 급여 총액을 초과할 수 없습니다.',
    'daily-worker-unconfirmed': '일용근로 해당 여부를 확인해야 산식 참고값을 표시할 수 있습니다.',
    'invalid-work-days': '근무 일수를 0보다 큰 숫자로 입력해 주세요.',
    'invalid-work-hours': '근무 시간을 0보다 큰 숫자로 입력해 주세요.',
  };
  const message = messages[result.reason] ?? '필수 조건을 확인해 주세요.';
  status.innerHTML = `<strong>계산을 보류합니다.</strong> ${message}`;
}

for (const control of controls) {
  control.addEventListener('input', render);
  control.addEventListener('change', render);
}

button.addEventListener('click', () => {
  byId('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

render();
