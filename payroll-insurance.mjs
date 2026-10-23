import {insurancePeriods} from './payroll-rules.mjs';
import {wonInput,validDate} from './payroll-calculator.mjs';
const review=reason=>({status:'review-required',reason,premium:null});
const number=v=>v===''||v===null||v===undefined?null:Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
export function assessInsurance(input={}){
 const date=input.month?input.month+'-01':'';
 const period=validDate(date)&&insurancePeriods.find(p=>p.from<=date&&p.to>=date);
 if(!period)return {pension:review('보험 적용월(2026년)을 입력해주세요.'),health:review('보험 적용월 확인 필요'),employment:review('보험 적용월 확인 필요'),workersCompensation:{employeeDeduction:0,reason:'산재보험 사업주 부담은 근로자 급여에서 공제하지 않습니다.'}};
 const days=number(input.monthlyDays),hours=number(input.monthlyHours),income=wonInput(input.monthlyIncome),age=number(input.age);
 const complete=days!==null&&Number.isInteger(days)&&days<=31&&hours!==null&&income!==null&&typeof input.continuousMonth==='boolean'&&typeof input.construction==='boolean';
 let pension=review('월 근로일·시간·소득, 1개월 이상 계속근로 및 연령·특례 확인 필요');
 if(complete&&age!==null&&age>=18&&age<60&&input.domesticOrdinary===true){
  if(input.construction&&!input.allSitesIncluded)pension=review('건설현장 우선 판단 및 동일 사업장 현장 합산 자료 확인 필요');
  else{
   const met=days>=8||(!input.construction&&hours>=60)||income>=2200000;
   pension={status:input.continuousMonth&&met?'subject-under-entered-conditions':'criteria-not-met',reason:'2025-07-01 월 판단 기준. 입력한 계속근로·월 자료에 한정한 판정이며 취득·상실 신고를 대신하지 않습니다.',premium:null};
   if(pension.status==='subject-under-entered-conditions'){
    const assessed=wonInput(input.assessedMonthlyIncome);
    if(assessed!==null){const base=Math.max(period.pensionLower,Math.min(period.pensionUpper,Math.floor(assessed/1000)*1000));pension={...pension,base,rate:period.pensionEmployeeRate,unroundedEstimate:base*period.pensionEmployeeRate,reason:pension.reason+' 기준소득월액 상·하한과 4.75% 적용. 보험료 절사·월 부과·지급별 공제 배분 확인 전 자동 공제하지 않습니다.'};}
   }
  }
 }
 let health=review('건강보험 일용 자격취득·상실의 월별 이력과 고용 형태 확인 필요');
 if(days!==null&&Number.isInteger(days)&&days<=31&&typeof input.continuousMonth==='boolean'&&input.domesticOrdinary===true)health={status:input.continuousMonth&&days>=8?'subject-review-dates':'criteria-not-met-review',reason:'공단 안내의 1개월 이상·월 8일 기준으로 사전 점검. 취득·상실일·계속고용 특례는 확인 필요.',premium:null};
 const remuneration=wonInput(input.healthMonthlyRemuneration);
 if(health.status==='subject-review-dates'&&remuneration!==null){health.unroundedEstimate=remuneration*period.healthEmployeeRate;health.ltcUnroundedEstimate=health.unroundedEstimate*period.ltcToHealthRatio;health.reason+=' 월 보수 기준 3.595% 및 장기요양 비율 참고값. 끝수·상하한·정산을 확정하지 않아 자동 공제하지 않습니다.';}
 let employment=review('고용보험상 일용(1개월 미만 계약), 적용사업장 및 적용제외 여부를 별도로 확인해주세요.');
 if(input.eiDaily===true&&input.eiCoveredWorkplace===true&&input.eiExceptionsCleared===true)employment={status:'subject-under-entered-conditions',reason:'세법상 일용과 별개로 확인한 가입 대상. 0.9% 요율 확인, 보수·절사·기간별 고지 확인 전 공제 미확정.',rate:period.employmentEmployeeRate,premium:null};
 return {period,pension,health,employment,workersCompensation:{employeeDeduction:0,reason:'산재보험 및 고용안정·직업능력개발 등 사업주 전용 부담액은 공제하지 않습니다.'},billed:readBilled(input.billed)};
}
export function readBilled(billed={}){return Object.fromEntries(['pension','health','ltc','employment'].map(k=>[k,wonInput(billed?.[k])===null?null:{amount:wonInput(billed[k]),basis:'사용자 입력 공단 고지액',allocation:'월 고지액입니다. 지급 묶음에서 자동 차감하지 않습니다.'}]));}
