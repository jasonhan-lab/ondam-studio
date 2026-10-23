import {deductionValue,bindCalculationInputs} from './payroll-ui-values.mjs';
import {
  calculateDailyIncomeTax,
  assessNationalPension,
  assessOtherInsurance,
} from './payroll-calculator.mjs';

const byId = (id) => document.getElementById(id);
const numberField = (id, label, unit, placeholder = '예: 0') => {
  const field = document.createElement('div');
  field.className = 'field';
  const caption = document.createElement('label');
  caption.htmlFor = id;
  caption.textContent = label;
  const wrapper = document.createElement('div');
  wrapper.className = 'input-with-unit';
  const input = document.createElement('input');
  input.id = id;
  input.type = 'text';
  input.inputMode = 'decimal';
  input.placeholder = placeholder;
  const suffix = document.createElement('span');
  suffix.textContent = unit;
  wrapper.append(input, suffix);
  field.append(caption, wrapper);
  return { field, input };
};
const selectControl = (id, label, options) => {
  const field = document.createElement('div');
  field.className = 'field';
  const caption = document.createElement('label');
  caption.htmlFor = id;
  caption.textContent = label;
  const select = document.createElement('select');
  select.id = id;
  for (const [value, text] of options) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    select.append(option);
  }
  field.append(caption, select);
  return { field, select };
};

function installInputs() {
  const fields = [...document.querySelectorAll('.field-grid .field')];
  const findField = (prefix) => fields.find((field) => field.querySelector('label')?.textContent.trim().startsWith(prefix));
  const basisField = findField('입력 금액 기준');
  const periodField = findField('급여 기간');
  const employmentField = findField('근로 형태 확인');
  if (!basisField || !periodField || !employmentField) return null;

  const basis = selectControl('pay-basis', '입력 금액 기준', [
    ['', '선택해 주세요'], ['pretax', '세전 금액'], ['after-tax', '세후 금액'],
  ]);
  const period = selectControl('pay-period', '급여 기간', [
    ['', '선택해 주세요'], ['daily', '1일 일급'], ['aggregate', '기간 합계 (일급 산식 적용 불가)'],
  ]);
  const employment = selectControl('employment-type', '근로 형태 확인', [
    ['', '선택해 주세요'], ['daily-worker', '세법상 일용근로자 확인'], ['other-or-unknown', '해당하지 않거나 미확인'],
  ]);
  basisField.append(basis.select);
  periodField.append(period.select);
  employmentField.append(employment.select);

  const grid = document.querySelector('.field-grid');
  const nonTaxable = numberField('non-taxable-pay', '비과세 금액 (일급)', '원');
  const months = numberField('months-worked', '근로기간', '개월', '예: 1');
  const monthlyDays = numberField('monthly-work-days', '월 근로일수', '일', '예: 8');
  const monthlyHours = numberField('monthly-work-hours', '월 근로시간', '시간', '예: 60');
  const monthlyIncome = numberField('monthly-income', '월 소득', '원', '예: 2,200,000');
  const construction = selectControl('construction-site', '건설현장 근무 여부', [
    ['', '선택해 주세요'], ['no', '아니요 / 해당 없음'], ['yes', '예 (현장 간 합산 검토 필요)'],
  ]);
  const group = selectControl('payout-group', '지급 묶음 확인', [
    ['', '미확인'], ['single', '해당 일급 1건만 지급'], ['multiple', '여러 일급을 함께 지급'],
  ]);
  const insuranceHeading = document.createElement('p');
  insuranceHeading.className = 'field-wide';
  insuranceHeading.textContent = '사회보험 참고 입력 · 소득세 계산과 별도';
  insuranceHeading.style.cssText = 'margin:4px 0 -8px;color:#687773;font-size:12px;font-weight:700';
  grid.append(nonTaxable.field, insuranceHeading, months.field, monthlyDays.field, monthlyHours.field, monthlyIncome.field, construction.field, group.field);

  const oldButton = document.querySelector('.form-footer .button-disabled');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button button-disabled';
  button.id = 'calculate-pay';
  button.textContent = '예상 기준 확인 →';
  oldButton?.replaceWith(button);
  return { basis: basis.select, period: period.select, employment: employment.select, button };
}

function readInput() {
  return {
    grossPay: byId('gross-pay')?.value,
    nonTaxablePay: byId('non-taxable-pay')?.value,
    payBasis: byId('pay-basis')?.value,
    payPeriod: byId('pay-period')?.value,
    employmentType: byId('employment-type')?.value,
    workDays: byId('work-days')?.value,
    workHours: byId('work-hours')?.value,
  };
}

function won(value) {
  return new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 3 }).format(value);
}
function addResultPanel() {
  const panel = document.createElement('div');
  panel.className = 'state-card review-state';
  panel.id = 'calculation-details';
  panel.setAttribute('aria-live', 'polite');
  panel.style.marginTop = '14px';
  const heading = document.createElement('h3');
  heading.textContent = '계산 참고값 · 최종 지급액 아님';
  const details = document.createElement('div');
  details.id = 'calculation-details-body';
  panel.append(heading, details);
  document.querySelector('.result-card')?.after(panel);
  return details;
}
function row(label, value) {
  const item = document.createElement('div');
  item.className = 'deduction-row';
  const name = document.createElement('span');
  name.textContent = label;
  const amount = document.createElement('strong');
  amount.textContent = value;
  item.append(name, amount);
  return item;
}

function start() {
  const controls = installInputs();
  if (!controls) return;
  const detailBody = addResultPanel();
  const statusNotice = document.querySelector('.notice-bar p');
  const netAmount = document.querySelector('.take-home > strong');
  const rows = [...document.querySelectorAll('.deduction-list .deduction-row')];

  const render = () => {
    const result = calculateDailyIncomeTax(readInput());
    const pension = assessNationalPension({
      monthsWorked: byId('months-worked')?.value,
      monthlyWorkDays: byId('monthly-work-days')?.value,
      monthlyWorkHours: byId('monthly-work-hours')?.value,
      monthlyIncome: byId('monthly-income')?.value,
      constructionSite: byId('construction-site')?.value === 'yes' ? true : byId('construction-site')?.value === 'no' ? false : undefined,
    });
    const insurance = assessOtherInsurance();
    detailBody.replaceChildren();

    if (!result.canCalculate) {
      const message = result.reason === 'daily-worker-unconfirmed'
        ? '세법상 일용근로자 여부가 확인되지 않아 일용근로소득 산식 참고값을 계산하지 않습니다.'
        : result.reason === 'not-daily-pay'
          ? '기간 합계 금액에는 일급 산식을 적용하지 않습니다. 일급을 별도로 확인해 주세요.'
          : result.reason === 'not-pretax'
            ? '세전 금액으로 확인된 경우에만 산식 참고값을 표시합니다.'
            : result.reason === 'non-taxable-exceeds-gross'
              ? '비과세 금액이 급여 총액을 초과합니다. 입력값을 확인해 주세요.'
              : '필수 입력 또는 금액 형식을 확인해 주세요.';
      if (statusNotice) statusNotice.textContent = message;
      if (netAmount) netAmount.innerHTML = '— <small>원</small>';
      for (const item of rows) item.querySelector('strong').textContent = '— 원';
      detailBody.append(row('소득세 산식 참고값', '계산 보류'), row('지방소득세', '미확정 · 계산 보류'), row('최종 실수령액', '산출하지 않음'));
      controls.button.classList.add('button-disabled');
      return;
    }

    if (statusNotice) statusNotice.textContent = '반올림 전 산식 참고값만 표시합니다. 지급 묶음·원 단위 처리와 지방소득세 규칙이 확정되지 않아 최종 세액 및 실수령액은 보류합니다.';
    if (netAmount) netAmount.innerHTML = '보류 <small>최종액 미확정</small>';
    const groupValue = byId('payout-group')?.value;
    const groupingStatus = groupValue === 'single'
      ? '단일 지급으로 선택됨; 실제 지급 자료 확인 필요'
      : groupValue === 'multiple'
        ? '복수 일급 합산 필요; 지급별 자료 미입력'
        : '지급 묶음 미확인';

    for (const item of rows) {
      const label = item.querySelector('span')?.textContent ?? '';
      const strong = item.querySelector('strong');
      strong.textContent = deductionValue(label, result);
    }
    detailBody.append(
      row('과세대상 일급', `${won(result.taxableDailyPay)}원`),
      row('근로소득공제 참고액', `${won(result.earnedIncomeDeduction)}원`),
      row('산출세액 참고값 (6%)', `${won(result.statutoryTaxBeforeCreditFormulaValue)}원`),
      row('근로소득세액공제 참고값 (55%)', `${won(result.earnedIncomeTaxCreditFormulaValue)}원`),
      row('소득세 산식 참고값 (반올림 전)', `${won(result.incomeTaxFormulaValue)}원`),
      row('산식 참고값 기준 1,000원 미만', result.smallCollectionFormulaReference ? '예 · 지급묶음 최종 판단 아님' : '아니요 · 지급묶음 확인 필요'),
      row('지급 묶음 상태', groupingStatus),
      row('지방소득세 산정액', '미확정 · 원 단위/적용 순서 확인 필요'),
      row('최종 소득세 / 실수령액', '보류 · 확정 산출하지 않음'),
      row('국민연금 참고 판정', pension.status === 'potentially-applicable-review-required' ? '적용 가능성 있음 · 공단 기준 확인 필요' : pension.status === 'thresholds-not-met-under-supplied-rule' ? '제공 기준 문턱 미충족' : '미확정 / 추가 확인 필요'),
      row('국민연금 판정 근거', pension.reason),
      row('건강보험 / 고용보험 / 산재보험', `${insurance.healthInsurance.status} · 보험료 산출 안 함`),
    );
    controls.button.classList.add('button-disabled');
  };

  controls.button.addEventListener('click', render);
  bindCalculationInputs(document.querySelectorAll('#gross-pay, #work-days, #work-hours, #non-taxable-pay, #pay-basis, #pay-period, #employment-type, #months-worked, #monthly-work-days, #monthly-work-hours, #monthly-income, #construction-site, #payout-group'), render);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
