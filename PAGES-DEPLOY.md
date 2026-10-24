# 공개 사이트 업데이트

개발 브랜치 `codex/ondam-bad24a22a7ee93a8169ebcd2`에서 수정 → 저장 → 소스 제어에서 커밋 → 푸시(변경 내용 동기화)하면 자동으로 테스트·정적 파일 검사 후 GitHub Pages에 배포합니다. 저장만으로는 공개되지 않습니다.

주소: https://jasonhan-lab.github.io/daypayroll/

진행·오류: https://github.com/jasonhan-lab/daypayroll/actions

검사 실패 시 배포 job은 실행되지 않으며 기존 공개 버전이 유지됩니다. 오류를 수정하고 다시 커밋·푸시하세요. 자동 검사는 법령·세무 기준 전체의 유효성을 보증하지 않습니다.

`codex/daypayroll-pages`는 최초 수동 배포 기록으로 보존합니다. 현재 자동 배포는 위 개발 브랜치를 기준으로 하며 이 과거 배포 브랜치를 편집할 필요가 없습니다.

HTML/CSS/브라우저 JS 및 참조한 정적 자산과 robots.txt·sitemap.xml만 `_site/`로 복사합니다. 테스트·문서·편집기 설정·개인 저장 기록은 Pages에 올리지 않습니다. 비밀키 형태·서버 API 의존성·누락된 자산은 빌드가 차단하므로 기능 확대 시 검토가 필요합니다.

원하면 로컬에서 먼저 검사할 수 있습니다(Node 24):

```sh
node --test
node tools/build-pages.mjs
node tools/verify-pages.mjs
```
