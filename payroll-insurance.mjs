import {insurancePeriods} from './payroll-rules.mjs';
import {wonInput,validDate} from './payroll-calculator.mjs';
const review=reason=>({status:'review-required',reason,premium:null});
const number=v=>v===''||v===null||v===undefined?null:Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
export function assessInsurance(input={}){
 const date=input.month?input.month+'-01':'';
 const period=validDate(date)&&insurancePeriods.find(p=>p.from<=date&&p.to>=date);
 if(!period)return {employment:assessDailyEmployment(input),pension:review('보험 적용월(2026년)을 입력해주세요.'),health:review('보험 적용월 확인 필요'),workersCompensation:{employeeDeduction:0,reason:'산재보험 사업주 부담은 근로자 급여에서 공제하지 않습니다.'}};
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
 const employment=assessDailyEmployment(input);
 return {period,pension,health,employment,workersCompensation:{employeeDeduction:0,reason:'산재보험 및 고용안정·직업능력개발 등 사업주 전용 부담액은 공제하지 않습니다.'},billed:readBilled(input.billed)};
}
export function readBilled(billed={}){return Object.fromEntries(['pension','health','ltc','employment'].map(k=>[k,wonInput(billed?.[k])===null?null:{amount:wonInput(billed[k]),basis:'사용자 입력 공단 고지액',allocation:'월 고지액입니다. 지급 묶음에서 자동 차감하지 않습니다.'}]));}

// Employment insurance is independent from pension/health monthly day/hour gates.
export function assessDailyEmployment(input={}){
 const report={reportingStatus:'required-in-principle',status:'review-required',premium:null,employeeRate:.009,missing:[],reason:'일용근로자는 근로일수·시간과 무관하게 원칙적 가입 신고 대상입니다.',checkedAt:'2026-10-23'};
 const workplace=input.workplace??(input.eiCoveredWorkplace===true?'covered':''),age=input.ageCase??(input.eiExceptionsCleared===true?'under65':''),residency=input.residency??(input.eiExceptionsCleared===true?'KR':'');
 if(input.dailyWorker===false||input.eiDaily===false){report.reportingStatus='review-required';report.missing.push('고용보험상 일용 해당 여부');}
 if(workplace!=='covered'){report.missing.push(workplace==='excluded'?'적용 제외 사업의 법적 근거·임의가입 여부':'적용 사업장 여부');report.reportingStatus='review-required';}
 if(!['under65','continued65','new65'].includes(age))report.missing.push('65세 이후 신규 고용 또는 종전 피보험자격의 계속 유지 여부');
 const mandatory=['KR','F-2','F-5','F-6'].includes(residency),optional=['E-9','H-2'].includes(residency);
 if(!mandatory&&!optional)report.missing.push('외국인 체류자격·상호주의·임의가입 등 적용 구분');
 if(optional&&!['joined','not-joined'].includes(input.voluntary))report.missing.push('실업급여 임의가입 여부');
 if(report.missing.length)return {...report,reason:report.reason+' 정보 부족을 보험료 면제로 처리하지 않습니다.'};
 if(age==='new65')return {...report,status:'employee-excluded',premium:0,reason:'65세 이후 신규 고용: 가입 신고와 사업주 고용안정·직능 부담은 유지될 수 있으나 근로자 실업급여 보험료는 제외합니다.'};
 if(optional&&input.voluntary==='not-joined')return {...report,status:'employee-excluded',premium:0,reason:'E-9/H-2 실업급여 미가입 확인: 고용안정·직능은 당연 적용, 근로자 실업급여 공제는 제외합니다.'};
 return {...report,status:'subject-under-entered-conditions',reason:'가입 신고 대상·근로자 실업급여 0.9% 적용. 월 8일·60시간 기준을 사용하지 않습니다.'};
}
export function employmentEstimate(base,input={}){const decision=assessDailyEmployment(input),amount=wonInput(base);if(amount===null)return {...decision,amount:null,error:'보험료 산정 보수 확인 필요'};const reference=Number(BigInt(amount)*9n)/1000;return {...decision,base:amount,referenceAmount:reference,amount:decision.status==='subject-under-entered-conditions'?reference:decision.status==='employee-excluded'?0:null,amountKind:'입력 보수 기준 예상액 · 공단 고지액 아님',rounding:'끝수·월 부과·정산은 공단 기준 확인. 원 미만을 임의 절사하지 않음'};}
