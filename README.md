# 살아있는 숲

현재 테스트판: V1.10.29 test  
기준 버전: V1.10.28 test  
최근 업데이트: 관리자 대시보드 자동 집계 연결 준비판  
공개 주소: https://inhm1234.github.io/living_forest/

## V1.10.29 test 핵심 변경점

V1.10.29 test는 `/admin.html` 관리자 대시보드에 실제 숫자를 자동 표시하기 위한 연결 구조를 준비한 버전입니다.

이번 버전에서 추가/개선된 내용:

- 사용자 행동을 Google Apps Script 웹 앱으로 전송할 수 있는 구조 준비
- 관리자 화면에서 Apps Script 요약 데이터를 읽어올 수 있는 구조 준비
- 실제 숫자 표시용 DOM ID와 계산 로직 추가
- 클릭률, 이름 저장률, 감정 기록률, 공유율 자동 계산 구조 추가
- Apps Script 샘플 코드 파일 추가
- Google Sheets 연결 안내 파일 추가

## 추가 파일

```text
APPS_SCRIPT_CODE.txt
SHEETS_SETUP_GUIDE.txt
```

## 현재 상태

이번 ZIP만 업로드하면 화면은 정상 작동하지만, 아직 Apps Script 웹 앱 URL이 비어 있기 때문에 실제 숫자는 표시되지 않습니다.

다음 단계에서 Google Sheets와 Apps Script를 만들고 웹 앱 URL을 발급받은 뒤, 그 URL을 코드에 넣으면 실제 자동 집계가 시작됩니다.
