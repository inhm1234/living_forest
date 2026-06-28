오늘의숲 — DEV 장식 12종 확장 패치

작업 범위
- DEV 전용: dev/garden-login-test/garden.js
- DEV 전용: dev/garden-login-test/garden.css
- 공용 정적 이미지: assets/decorations/ (기존 4개 + 새 8개)
- 운영 루트의 index.html, style.css, app.js는 이 ZIP에 포함하지 않았고 수정하지 않습니다.
- Code.gs는 포함하지 않았고 수정하지 않습니다.

이번 패치 내용
1. 장식 카탈로그를 4종에서 12종으로 넓혔습니다.
2. 프런트엔드에서 ‘보유 장식 수가 12종에 도달하면 발견 불가’로 막던 조건을 제거했습니다.
3. 하루 1개 제한은 브라우저가 아니라 Supabase의 record_id UNIQUE 제약으로 계속 유지됩니다.
4. 같은 종류가 다시 발견되어도 각 garden_found_items.id 별로 따로 그려지고, 꾸미기 좌표도 각각 저장됩니다.
5. 기본 배치 자리를 4곳에서 12곳으로 넓혔습니다. 기존 4개 자리의 좌표는 건드리지 않았습니다.

아직 하지 않은 것
- Supabase SQL 실행: 아직 하지 마세요. 다음 단계에서 현재 함수와 제약을 바꾸는 SQL을 별도로 드립니다.
- DEV / 운영 업로드: 아직 하지 마세요. 이 ZIP은 검토용 패치 파일입니다.

업로드가 필요해지는 다음 단계
- GitHub living_forest 저장소의 dev/garden-login-test/garden.js
- GitHub living_forest 저장소의 dev/garden-login-test/garden.css
- GitHub living_forest 저장소의 assets/decorations/ 안 8개 새 PNG

기존 4개 장식 파일은 이 ZIP에 참조용으로 함께 들어 있으나, 업로드할 때 덮어쓸 필요는 없습니다.
