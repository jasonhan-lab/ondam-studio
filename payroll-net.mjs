import {employmentRateFor} from './payroll-workers.mjs';
import {calculateQuick,wonInput} from './payroll-calculator.mjs';
/** Inverse of the existing forward calculation; same daily wage, whole won, explicit deductions. */
export function resolveQuick(input={}){
 if(input.inputBasis!=='net')return calculateQuick(input);
 const target=wonInput(input.receivedPay),days=Number(input.workDays),nt=wonInput(input.nonTaxableDailyPay??0);
 if(target===null||target===0||!Number.isInteger(days)||days<1||days>366||nt===null)return {ok:false,error:'실제로 받은 총액과 일한 일수(1~366일)를 입력해주세요.'};
 if(!['tax-only','employment'].includes(input.netDeductions))return {ok:false,error:'받은 금액에서 어떤 항목이 공제되었는지 선택해주세요. 다른 공제가 있거나 모르면 급여명세서 확인이 필요합니다.'};
 const configured=employmentRateFor(input.calculationDate??'2026-10-23')?.employmentEmployeeRate;if(input.netDeductions==='employment'&&configured===undefined)return {ok:false,error:'해당 적용일의 고용보험 요율이 설정되지 않았습니다.'};const rate=input.netDeductions==='employment'?configured:0,candidates=new Map();
 // On each side of the small-collection discontinuity, truncation changes
 // net by less than 21 won per payment. Cover both linear branches rather
 // than binary-searching a globally non-monotonic function.
 for(const taxed of [false,true]){
  const slope=1-rate-(taxed?.0297:0),constant=(taxed?4455+.0297*nt:0)+rate*nt;
  const center=(target/days-constant)/slope,margin=Math.ceil(21/slope)+3;
  for(let gross=Math.max(1,nt,Math.floor(center)-margin);gross<=Math.ceil(center)+margin;gross++){
   const r=calculateQuick({...input,grossDailyPay:gross});if(!r.ok)continue;
   const premium=rate?Number(BigInt((gross-nt)*days)*BigInt(Math.round(rate*1000000)))/1000000:0,net=r.totals.netBeforeInsurance-premium;
   candidates.set(gross,{r,premium,net,difference:net-target});
  }
 }
 const ranked=[...candidates.values()].sort((a,b)=>Math.abs(a.difference)-Math.abs(b.difference)||a.r.grossDailyPay-b.r.grossDailyPay),best=ranked[0];
 if(!best)return {ok:false,error:'이 조건으로 역산할 수 없습니다. 비과세 금액과 지급 방식을 확인해주세요.'};
 const exact=ranked.filter(c=>Math.abs(c.difference)<.000001);
 return {...best.r,inverse:{target,premium:best.premium,net:best.net,difference:best.difference,exact:exact.length>0,candidates:exact.map(c=>c.r.grossDailyPay),deductions:input.netDeductions,note:'동일한 하루 급여·선택한 공제만 가정한 역산입니다. 실제 급여명세서를 확정하거나 다른 공제를 추정하지 않습니다.'}};
}
