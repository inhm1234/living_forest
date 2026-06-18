오늘의숲 DEV v0.2.12 공터 보강 + 뒤쪽 나무 보정 테스트 패치

적용 파일
- dev/index.html
- dev/app.js
- dev/style.css

핵심 변경
1) 왼쪽 파란 공터 영역이 비어 보이던 부분 보강
   - 길을 침범하지 않는 선에서 나무 2그루 추가
2) 뒤쪽 좌/우 빨간 표시 영역의 나무가 유령처럼 투명해 보이던 문제 보정
   - opacity를 높이고 blur를 줄여 더 자연스럽게 수정
3) 기존 path-safe 방향은 유지
   - 길은 계속 비우고, 공터 쪽에만 숲 밀도를 보강

권장 커밋 메시지
DEV v0.2.12 fill left + fix back trees
