# 살아있는 숲

현재 테스트판: V1.10.30 test  
기준 버전: V1.10.29 test  
최근 업데이트: 관리자 실제 데이터 연결판  
공개 주소: https://inhm1234.github.io/living_forest/

## V1.10.30 test 핵심 변경점

V1.10.30 test는 Apps Script 웹 앱 URL을 실제 코드에 연결한 버전입니다.

연결된 Apps Script URL:

```text
https://script.google.com/macros/s/AKfycbyeqnUwroduXytKBFMs9Tpl2gngoJ0f6JmF9oKbEA-QAoJY0aFJ-bvOUWS15SFeErgkiA/exec
```

## 이제 가능한 흐름

```text
사용자가 살아있는 숲에서 행동
→ app.js가 Apps Script로 이벤트 전송
→ Google Sheets events 시트에 자동 기록
→ admin.html이 Apps Script summary 데이터를 읽어옴
→ 관리자 화면에 실제 숫자 표시
```

## 확인 방법

1. GitHub에 V1.10.30 파일 업로드
2. 일반 화면 접속
   https://inhm1234.github.io/living_forest/
3. 내 정원 이동, 감정 기록, 공유 클릭 등 테스트
4. Google Sheets의 events 시트에 기록이 생기는지 확인
5. 관리자 화면 접속
   https://inhm1234.github.io/living_forest/admin.html
6. 비밀번호 입력
   forest2026
7. 새로고침 버튼 클릭 후 숫자 표시 확인

## 주의

- 사용자가 입력한 나무 이름 실제 내용은 저장하지 않습니다.
- 익명 브라우저 ID와 이벤트 이름, 성장 일수, 화면 경로 정도만 저장합니다.
- 임시 관리자 비밀번호 방식은 완전한 보안이 아니므로 민감한 개인정보를 표시하지 않습니다.
