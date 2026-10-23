// Supported calculation window is separate from the source's enactment date.
const checkedAt='2026-10-23';
const rule=(title,url,effectiveStart=null,effectiveEnd=null,note='')=>({title,url,effectiveStart,effectiveEnd,checkedAt,note});
export const sources={
 tax:rule('국세청 · 일용근로소득·지급별 소액부징수','https://g.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7863&mi=6584',null,null,'현행 원문 확인. 최초 시행일은 안내 페이지에서 확인되지 않음.'),
 nationalRounding:rule('국고금 관리법 제47조 · 10원 미만 끝수','https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0047&lsiSeq=276079&urlMode=lsScJoRltInfoR','2026-01-02',null,'표시된 법령 버전 시행일. 일별 미리 절사하지 않고 지급 묶음 합계에서 처리.'),
 local:rule('지방세법 제103조의13 · 소득세의 10%','https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=13&joNo=0103&lsiSeq=282559&urlMode=lsScJoRltInfoR','2026-01-01'),
 localRounding:rule('지방회계법 제55조 · 끝수 처리','https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0055&lsiSeq=291205&urlMode=lsScJoRltInfoR','2026-10-20',null,'표시된 법령 버전 시행일. 국세청 6,750원 → 670원 사례와 대조.'),
 pension:rule('국민연금공단 · 가입 기준·2026 보험료율','https://m.nps.or.kr/pnsinfo/ntpsklg/getOHAF0016M0.do?menuId=MN24001108','2026-01-01','2026-12-31','총 9.5%, 근로자 4.75%. 일용 월 판단 기준은 2025-07-01 개정.'),
 pensionManual:rule('국민연금공단 · 2026 사업장 실무안내','https://www.nps.or.kr/fileDown.do?atchFileId=FL26000086&atchFileSn=1','2025-07-01',null,'32·38쪽: 1개월 이상, 일반 8일/60시간/220만원, 건설 현장 우선·사업장 합산.'),
 pensionBase:rule('국민연금공단 · 기준소득월액 상·하한','https://www.nps.or.kr/pnsinfo/ntpsklg/getOHAF0038M0.do?menuId=MN24001113','2026-07-01','2027-06-30','천원 미만 버림. 2026년 6월까지 40만~637만, 7월부터 41만~659만원.'),
 health:rule('건강보험공단 · 2026 보험료율','https://edi.nhis.or.kr/portal/images/popup/20251204_pop01longdesc.html','2026-01-01','2026-12-31','건강 7.19%, 근로자 50%. 장기요양은 건강보험료 × 0.9448% / 7.19%.'),
 healthEligibility:rule('건강보험공단 작성 · 가입 안내','https://www.yeonsu.go.kr/etc/bbs/SearchView.asp?bbs_code=board_1&seq=110561',null,null,'2024-11-06 공단 안내: 1개월 이상·월 8일. 취득·상실 세부 원문 재확인 필요.'),
 employment:rule('고용노동부·한국고용정보원 · 고용보험료','https://ei.work24.go.kr/ei/eih/eg/ei/eiEminsr/retrieveEi0301Info.do',null,null,'근로자 실업급여 0.9% 현행 확인. 최초 시행일은 이 페이지에서 확인되지 않음.'),
 employmentEligibility:rule('고용노동부·한국고용정보원 · 일용근로자','https://ei.work24.go.kr/ei/eih/eg/ei/eiEminsr/retrieveEi0201Info.do',null,null,'고용보험 일용은 1개월 미만 고용. 세법상 일용과 별개. 제외·특례 별도 확인.'),
};
export const taxRules=Object.freeze({id:'daily-tax-2026-v1',verifiedFrom:'2026-01-01',verifiedTo:'2026-12-31',checkedAt,dailyDeduction:150000,deMinimis:1000,roundingUnit:10,sourceIds:['tax','nationalRounding','local','localRounding']});
export const insurancePeriods=[
 {from:'2026-01-01',to:'2026-06-30',pensionLower:400000,pensionUpper:6370000,pensionEmployeeRate:.0475,healthEmployeeRate:.03595,ltcToHealthRatio:.009448/.0719,employmentEmployeeRate:.009},
 {from:'2026-07-01',to:'2026-12-31',pensionLower:410000,pensionUpper:6590000,pensionEmployeeRate:.0475,healthEmployeeRate:.03595,ltcToHealthRatio:.009448/.0719,employmentEmployeeRate:.009},
];

sources.employmentScope={title:'고용24 · 적용 대상·65세 계속고용·일용 예외',url:'https://ei.work24.go.kr/ei/eih/eg/ei/eiEminsr/retrieveEi0102Info.do',checkedAt:'2026-10-23',effectiveStart:null};
sources.employmentForeign={title:'고용24 · 체류자격별 가입과 부담 구분',url:'https://www.work24.go.kr/cm/c/f/1100/selecSystInfo.do?systId=SI00000419',checkedAt:'2026-10-23',effectiveStart:null};
