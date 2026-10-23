import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deductionValue,bindCalculationInputs} from './payroll-ui-values.mjs';
const result={grossDailyPay:200000,incomeTaxFormulaValue:1350};
test('local income tax stays unconfirmed instead of matching income tax substring',()=>{assert.equal(deductionValue('지방소득세 적용 조건 검토 필요',result),'미확정');assert.match(deductionValue('소득세 산식 검토 필요',result),/1,350/);});
test('unconfirmed insurance and totals never become final deduction amounts',()=>{assert.equal(deductionValue('예상 공제 합계',result),'미확정');assert.match(deductionValue('사회보험료',result),/미확인/);});
test('typing refreshes without a button click',()=>{const field=new EventTarget();let calls=0;bindCalculationInputs([field],()=>calls++);field.dispatchEvent(new Event('input'));assert.equal(calls,1);});
test('selection change refreshes without requiring an earlier input event',()=>{const select=new EventTarget();let calls=0;bindCalculationInputs([select],()=>calls++);select.dispatchEvent(new Event('change'));assert.equal(calls,1);});
