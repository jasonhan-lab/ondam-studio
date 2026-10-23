import {validDate,wonInput} from './payroll-calculator.mjs';
import {insurancePeriods} from './payroll-rules.mjs';
export const workerKey='haru-payroll-workers-v1';
export const normalSetting=()=>({exception:false,reason:'',from:'',to:'',memo:'',outcome:'keep',reporting:'unverified'});
const copy=x=>JSON.parse(JSON.stringify(x));
export function employmentRateFor(date){return validDate(date)?insurancePeriods.find(p=>p.from<=date&&date<=p.to):undefined;}
export function validateSetting(s){
 if(!s||typeof s.exception!=='boolean'||!['keep','exclude','review'].includes(s.outcome)||!['unverified','required','excluded','reported'].includes(s.reporting))throw Error('설정 형식을 확인해주세요.');
 if(s.exception){
  if(!['workplace','age65','foreign','other'].includes(s.reason)||!validDate(s.from)||s.to&&!validDate(s.to)||s.to&&s.to<s.from)throw Error('예외 사유와 올바른 적용 시작일·종료일을 입력해주세요.');
  if(!s.memo?.trim())throw Error('예외 확인 메모와 근거를 입력해주세요.');
 }
 return copy(s);
}
export function workerDeduction(base,setting,date){
 const period=employmentRateFor(date),amount=wonInput(base),s=setting??{...normalSetting(),outcome:'review'},active=!!s.exception&&validDate(s.from)&&s.from<=date&&(!s.to||date<=s.to),expired=!!s.exception&&!!s.to&&s.to<date;
 const incomplete=s.exception&&(!s.reason||!validDate(s.from)||!s.memo?.trim()||s.to&&(!validDate(s.to)||s.to<s.from));
 const outcome=incomplete?'review':active?s.outcome:setting?'keep':'review',rate=period?.employmentEmployeeRate;
 const reference=amount!==null&&rate!==undefined?Number(BigInt(amount)*BigInt(Math.round(rate*1000000)))/1000000:null;
 const review=outcome==='review'||reference===null;
 return {outcome:review?'review':outcome,rate:rate??null,period:period??null,base:amount,active,expired,amount:review?null:outcome==='exclude'?0:reference,referenceAmount:reference,confirmable:!review,reportingStatus:s.reporting??'unverified',missing:review?['예외 처리 결과·적용기간·요율 적용일 확인 필요']:[],reason:review?'확인 필요: 일반 공제를 가정해 미리 볼 수 있지만 급여 확정은 할 수 없습니다.':active?`사용자 확인 예외: ${outcome==='exclude'?'근로자 부담 공제 제외':'공제 유지'} · ${s.memo}`:expired?'예외 기간 종료 → 일반 기본 공제 적용':'일반 적용 · 사용자가 정한 운영 기본 공제',amountKind:'입력 보수 기준 예상액 · 공단 고지액 아님',rounding:'기존 고용보험 예상액 규칙 유지: 원 미만을 임의 절사하지 않습니다. 월 고지·정산액과 다를 수 있습니다.'};
}
export function loadWorkers(storage){
 const raw=storage.getItem(workerKey);if(raw){let d;try{d=JSON.parse(raw);}catch{throw Error('근로자 저장 자료 오류: 원본을 보존했습니다.');}if(d.version!==1||!Array.isArray(d.workers)||!Array.isArray(d.history)||!Array.isArray(d.confirmed))throw Error('근로자 저장 형식 오류: 원본을 보존했습니다.');return d;}
 // Discover only identified legacy workers. Anonymous quick calculations are
 // retained in their original key, never silently assigned to a new person.
 const d={version:1,workers:[],history:[],confirmed:[]},rawLedger=storage.getItem('haru-payroll-2026-ledger-v1');
 if(rawLedger){let old;try{old=JSON.parse(rawLedger);}catch{throw Error('이전 근로자 자료를 읽을 수 없습니다. 원본을 보존했습니다.');}
  for(const revision of old.revisions??[])for(const row of revision.input?.rows??[]){if(!row.workerId)continue;let w=d.workers.find(w=>w.legacyId===row.workerId);if(!w){w={id:'legacy-'+d.workers.length,legacyId:row.workerId,name:row.workerName||'이전 근로자 '+(d.workers.length+1),setting:null};d.workers.push(w);}
   const insurance=revision.input?.insurance,legacyInsurance=insurance&&['eiDaily','eiCoveredWorkplace','eiExceptionsCleared'].some(k=>Object.hasOwn(insurance,k))?insurance:undefined;
   const previous=row.employment??revision.input?.employment??insurance?.employment??legacyInsurance;
   if(previous){w.legacySetting=copy(previous);w.setting={...normalSetting(),exception:true,reason:'other',from:'2026-01-01',memo:'이전 예외 설정 보존. 원본과 적용기간 확인 필요.',outcome:'review'};}
  }
 }
 return d;
}
function persist(storage,d){storage.setItem(workerKey,JSON.stringify(d));return d;}
function audit(d,workerId,before,after,kind,now){d.history.push({id:crypto.randomUUID(),workerId,before:copy(before),after:copy(after),kind,at:now});}
export function addWorker(storage,name,now=new Date().toISOString()){
 if(!name?.trim())throw Error('근로자 이름을 입력해주세요.');const d=loadWorkers(storage),w={id:crypto.randomUUID(),name:name.trim(),setting:normalSetting()};d.workers.push(w);audit(d,w.id,null,w,'new-default',now);persist(storage,d);return w;
}
export function updateWorker(storage,id,setting,now=new Date().toISOString()){
 setting=validateSetting(setting);const d=loadWorkers(storage),w=d.workers.find(w=>w.id===id);if(!w)throw Error('근로자를 선택해주세요.');audit(d,id,w.setting,setting,'default-change',now);w.setting=setting;persist(storage,d);return d;
}
export function unsetWorkers(storage){return loadWorkers(storage).workers.filter(w=>w.setting===null);}
export function bulkDefaults(storage,previewIds,now=new Date().toISOString()){
 const d=loadWorkers(storage),eligible=d.workers.filter(w=>w.setting===null);if(JSON.stringify(eligible.map(w=>w.id).sort())!==JSON.stringify([...previewIds].sort()))throw Error('대상이 바뀌었습니다. 미리보기를 다시 확인해주세요.');
 for(const w of eligible){const s=normalSetting();audit(d,w.id,null,s,'bulk-default',now);w.setting=s;}return persist(storage,d);
}
export function confirmPayment(storage,{workerId,input,result,setting,date,override=false},now=new Date().toISOString()){
 const d=loadWorkers(storage),w=d.workers.find(w=>w.id===workerId);if(!w)throw Error('급여 확정 전 근로자를 선택해주세요.');
 validateSetting(setting);const decision=workerDeduction((result.grossDailyPay-result.nonTaxableDailyPay)*result.workDays,setting,date);
 if(!result.ok||!decision.confirmable)throw Error('확인 필요 항목의 처리 결과를 정한 후 확정해주세요.');
 if(result.inverse&&(!result.inverse.exact||result.inverse.candidates.length!==1))throw Error('세후 역산 후보가 여러 개이거나 차이가 있습니다. 명세서의 세전 금액을 확인해 세전 방식으로 확정해주세요.');
 if(result.inverse&&((result.inverse.deductions==='employment')!==(decision.amount!==0)))throw Error('역산에 선택한 공제 항목과 이번 지급 설정이 다릅니다. 확인 후 확정해주세요.');
 const signature=JSON.stringify({workerId,input,setting,date,override});if(d.confirmed.some(p=>p.signature===signature))throw Error('같은 입력의 확정 기록이 이미 있습니다. 중복 확정하지 않았습니다.');
 const frozen=copy({id:crypto.randomUUID(),workerId,workerName:w.name,input,result,setting,date,override,decision,net:result.totals.netBeforeInsurance-decision.amount,confirmedAt:now,signature});
 d.confirmed.push(frozen);audit(d,workerId,w.setting,setting,override?'payment-only':'payment-confirmed',now);persist(storage,d);return frozen;
}
