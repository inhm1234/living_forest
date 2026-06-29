오늘의숲 DEV - 언제든 찾을 수 있는 '내 폰에 심기' 계정 메뉴 패치

업로드 파일
- dev/garden-login-test/index.html
- dev/garden-login-test/garden.css
- dev/garden-login-test/garden.js

변경 내용
1) 상단의 '내 정원' 이름 칩을 누르면 '내 정원 메뉴'가 열립니다.
2) 메뉴 안의 '내 폰에 심기'는 자동 설치 카드가 숨겨져 있어도 항상 사용할 수 있습니다.
3) 카카오톡 Android 안에서는 'Chrome에서 열어 홈 화면에 심어요.' 안내와 함께 기존 Chrome 전환 동작을 사용합니다.
4) iPhone/iPad에서는 Safari 공유 메뉴의 '홈 화면에 추가' 안내를 토스트로도 보여 줍니다.
5) 이미 홈 화면 앱으로 연 상태에서는 '이미 홈 화면에 심긴 오늘의숲을 열고 있어요.'라고 안내합니다.

변경하지 않은 것
- 운영 루트 파일 (/index.html, /style.css, /app.js)
- Cloudflare 운영판
- Supabase SQL 및 데이터
- Code.gs
