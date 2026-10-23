import {taxRules} from './payroll-rules.mjs';
export function wonInput(value) {
 if(typeof value==='string'){if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(value.trim()))return null;value=Number(value.replaceAll(',',''));}
 return Number.isSafeInteger(value)&&value>=0&&value<=100000000000?value:null;
}
export function validDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
export function classifyTax(input={}){
 if(input.incomeType==='business')return {status:'not-daily',reason:'사업소득은 일용근로소득 계산 대상이 아닙니다.'};
 if(input.incomeType==='ordinary'||input.monthlySalary===true||input.longContract===true)return {status:'not-daily',reason:'일반 근로소득 검토 대상입니다. 일용 산식을 적용하지 않습니다.'};
 if(input.incomeType!=='daily'||input.taxDailyConfirmed!==true||!['general','construction'].includes(input.taxOccupation))return {status:'review-required',reason:'계약·근로 형태에 따른 세법상 일용 여부를 먼저 확인해주세요. 항만·특수 업종은 별도 검토합니다.'};
 return {status:'daily-confirmed',reason:'사용자 확인 소득 구분으로 계산합니다. 보험 가입은 별도로 판단합니다.'};
}
export function dailyTax(gross,nonTaxable){
 gross=wonInput(gross);nonTaxable=wonInput(nonTaxable);
 if(gross===null||nonTaxable===null||nonTaxable>gross)throw Error('급여·비과세는 0 이상의 원 단위 정수이며, 비과세는 급여 이하여야 합니다.');
 const taxable=gross-nonTaxable,excess=Math.max(0,taxable-taxRules.dailyDeduction);
 return {gross,nonTaxable,taxable,deduction:Math.min(taxable,taxRules.dailyDeduction),excess,statutoryTax:excess*.06,credit:excess*.033,taxNumerator:BigInt(excess)*27n};
}
export function calculateLedger(input={}){
 if(!input||typeof input!=='object')return {ok:false,error:'입력 자료가 없습니다.'};
 const classification=classifyTax(input);
 if(classification.status!=='daily-confirmed')return {ok:false,classification,error:classification.reason};
 if(input.payBasis!=='pretax')return {ok:false,error:'세전→지급액만 제공합니다. 세후 역산은 아직 지원하지 않습니다.'};
 try{
  if(!Array.isArray(input.rows)||!input.rows.length||input.rows.length>366)throw Error('근무일을 1~366건 입력해주세요.');
  const bundles=new Map(),days=new Set();
  for(const row of input.rows){
   for(const key of ['workDate','periodStart','periodEnd','paymentDate'])if(!validDate(row[key]))throw Error('근무일·귀속기간·실제 지급일을 모두 올바르게 입력해주세요.');
   if(row.periodStart>row.workDate||row.periodEnd<row.workDate||row.periodStart>row.periodEnd)throw Error('근무일은 귀속기간 안에 있어야 합니다.');
   if(row.paymentDate<row.workDate)throw Error('선급·분할 지급은 별도 확인이 필요합니다. 실제 지급일을 확인해주세요.');
   if(row.workDate<taxRules.verifiedFrom||row.workDate>taxRules.verifiedTo||row.paymentDate<taxRules.verifiedFrom||row.paymentDate>taxRules.verifiedTo)throw Error('이 버전은 2026년 근무·지급분을 지원합니다. 다른 연도는 규칙 확인이 필요합니다.');
   if(!row.workerId?.trim()||!row.employerId?.trim()||!row.bundleId?.trim())throw Error('근로자·사업장·실제 지급 묶음 ID가 필요합니다.');
   const day=JSON.stringify([row.workerId.trim(),row.employerId.trim(),row.workDate]);
   if(days.has(day))throw Error('같은 근로자·사업장·근무일이 중복됩니다. 하루 급여는 합쳐 입력하고 분할 지급은 별도 확인해주세요.');days.add(day);
   const key=JSON.stringify([row.workerId.trim(),row.employerId.trim(),row.bundleId.trim()]);
   if(!bundles.has(key))bundles.set(key,{workerId:row.workerId.trim(),employerId:row.employerId.trim(),bundleId:row.bundleId.trim(),paymentDate:row.paymentDate,rows:[],numerator:0n,gross:0n});
   const group=bundles.get(key);if(group.paymentDate!==row.paymentDate)throw Error('같은 지급 묶음의 실제 지급일이 달라서는 안 됩니다.');
   const t=dailyTax(row.gross,row.nonTaxable);group.rows.push({...row,...t,taxNumerator:t.taxNumerator.toString(),unroundedTax:Number(t.taxNumerator)/1000});group.numerator+=t.taxNumerator;group.gross+=BigInt(t.gross);
  }
  const results=[...bundles.values()].map(g=>{
   const exempt=g.numerator<1000000n,incomeTax=exempt?0:Number(g.numerator/10000n)*10,localTax=Math.floor(incomeTax/100)*10;
   if(g.gross>BigInt(Number.MAX_SAFE_INTEGER))throw Error('합계가 안전 계산 범위를 초과했습니다.');
   return {...g,numerator:g.numerator.toString(),gross:Number(g.gross),unroundedTax:Number(g.numerator)/1000,exempt,incomeTax,localTax,netBeforeInsurance:Number(g.gross)-incomeTax-localTax,ruleId:taxRules.id};
  });
  const totals=results.reduce((a,g)=>({gross:a.gross+g.gross,incomeTax:a.incomeTax+g.incomeTax,localTax:a.localTax+g.localTax,netBeforeInsurance:a.netBeforeInsurance+g.netBeforeInsurance}),{gross:0,incomeTax:0,localTax:0,netBeforeInsurance:0});
  if(!Object.values(totals).every(Number.isSafeInteger))throw Error('전체 합계가 안전 계산 범위를 초과했습니다.');
  return {ok:true,classification,bundles:results,totals,ruleId:taxRules.id,insuranceStatus:'별도 확인',finalNet:null};
 }catch(e){return {ok:false,error:e.message};}
}
