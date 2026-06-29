DEV 동물 카드 클릭 불가 수정

업로드할 파일:
- dev/garden-login-test/garden.css

변경 내용:
- .garden-world 안의 .animal-encounter-card에 pointer-events: auto를 추가했습니다.
- 카드와 "조용히 둘러보기", "편지 맡기기", 닫기 버튼의 클릭이 다시 전달됩니다.

수정하지 않는 대상:
- dev/garden-login-test/index.html
- dev/garden-login-test/garden.js
- 운영 루트 파일
- Supabase SQL
- Code.gs
