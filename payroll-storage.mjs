import {calculateLedger} from './payroll-calculator.mjs';
export const storageKey='haru-payroll-2026-ledger-v1';
export function saveLedger(storage,input,now=new Date().toISOString()) {
 const result=calculateLedger(input);if(!result.ok)throw Error(result.error);
 const previous=loadLedger(storage);const revisions=[...previous.revisions,{savedAt:now,input,result}];
 if(revisions.length>100)throw Error('저장 버전 100개입니다. JSON 내보내기 후 보관 정책을 확인해주세요.');
 const document={version:1,revisions};storage.setItem(storageKey,JSON.stringify(document));return document;
}
export function loadLedger(storage) {
 const raw=storage.getItem(storageKey);if(!raw)return {version:1,revisions:[]};
 let value;try{value=JSON.parse(raw);}catch{throw Error('저장 자료를 읽을 수 없습니다. 기존 자료를 보존했습니다.');}
 if(value.version!==1||!Array.isArray(value.revisions)||value.revisions.length>100||value.revisions.some(r=>!r||typeof r.savedAt!=='string'||!calculateLedger(r.input).ok))throw Error('저장 자료 형식이 맞지 않습니다. 기존 자료를 보존했습니다.');
 return value;
}
