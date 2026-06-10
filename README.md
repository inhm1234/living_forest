# 살아있는 숲

현재 테스트판: V1.16.1 test  
기준 버전: V1.16 test  
최근 업데이트: 버전 정리 / 배포 확인 안정화판  
공개 주소: https://inhm1234.github.io/living_forest/

## V1.16.1 test 핵심 변경점

V1.16.1 test는 새 기능을 추가하는 버전이 아니라, V1.16에서 추가한 `숲 일기장 1차`가 실제 공개 화면에서 헷갈리지 않게 보이도록 버전 표시와 캐시값을 정리한 안정화판입니다.

## 유지되는 핵심 기능

- 내 정원 화면의 `숲 일기장` 카드
- 감정 기록 후 표시되는 `오늘의 숲 문장`
- 최근 3개의 숲 기록 표시
- 최근 감정 흐름 요약
- 월드 숲 자리감 / 내 자리 포커스 유지
- 방문자 / 방문 기록 기능 유지
- 관리자 / GA4 / Google Sheets / Apps Script 구조 유지

## 정리한 내용

- 일반 화면 표시 버전: `V1.16.1 test`로 통일
- 관리자 화면 표시 버전: `V1.16.1 test`로 통일
- `style.css`, `app.js`, `admin.css`, `admin.js` 연결 캐시값을 `1.16.1-test`로 갱신
- README / VERSION / UPLOAD_GUIDE / LAUNCH_CHECKLIST 문구를 V1.16.1 기준으로 정리
- 데이터 저장 구조는 그대로 유지 (`localStorage`, schema 4)

## 확인 방법

1. GitHub에 V1.16.1 파일 업로드
2. 일반 화면 접속  
   https://inhm1234.github.io/living_forest/
3. 화면 상단 버전이 `V1.16.1 test`인지 확인
4. 내 정원으로 이동
5. 감정 기록 후 `숲 일기장`, `오늘의 숲 문장`, `최근 숲 기록`, `최근 숲의 흐름`이 보이는지 확인
6. 관리자 화면 접속  
   https://inhm1234.github.io/living_forest/admin.html
7. 관리자 화면 상단이 `Living Forest Admin · V1.16.1 test`인지 확인

## 주의

- 이번 버전은 기능 추가판이 아니라 버전/캐시 정리판입니다.
- Apps Script를 새로 배포하지 않아도 됩니다.
- 기존 assets 폴더와 이미지 파일은 삭제하지 마세요.
- 기존 사용자의 숲 기록은 저장 키를 유지하므로 이어서 보입니다.
