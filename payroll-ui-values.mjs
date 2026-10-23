export function deductionValue(label, result) {
  const won = value => new Intl.NumberFormat('ko-KR', {maximumFractionDigits:3}).format(value);
  if (label.includes('지방소득세')) return '미확정';
  if (label.includes('급여 총액')) return won(result.grossDailyPay)+'원 (총액)';
  if (label.includes('소득세')) return won(result.incomeTaxFormulaValue)+'원 (산식 참고값)';
  if (label.includes('사회보험료')) return '판정 참고 · 금액 미확인';
  return '미확정';
}
export function bindCalculationInputs(elements, render) {
  for (const element of elements) {
    element.addEventListener('input', render);
    element.addEventListener('change', render);
  }
}
