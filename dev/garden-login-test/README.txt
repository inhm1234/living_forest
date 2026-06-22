오늘의숲 · 카카오 로그인 내 정원 테스트 v0.2

이 폴더는 기존 운영 화면을 수정하지 않는 로그인 실험장입니다.

업로드 위치
living_forest/dev/garden-login-test/

파일 구성
- index.html
- garden.css
- garden.js
- README.txt

이 버전에서 실제로 되는 것
- 카카오 계정으로 로그인
- 로그인 후 내 정원으로 돌아오기
- 새로고침 후 로그인 상태 유지
- 계정별 브라우저 저장 공간 분리
- 로그아웃

아직 테스트인 것
- 마음 기록 / 성장 / 편지는 현재 이 기기 브라우저 안에서만, 로그인한 계정별로 저장됩니다.
- Supabase 데이터베이스 표에 저장하는 기능은 다음 단계입니다.
- 실제 친구 추가·편지 전송은 아직 없습니다.

업로드 전 Supabase 확인 1개
Authentication → Sign In / Providers → Kakao
→ "Allow users without an email"을 ON으로 설정 후 Save

이유: 현재 카카오 앱은 Biz 앱이 아니어서 카카오 이메일 동의항목을 받지 못할 수 있습니다.

테스트 주소
https://inhm1234.github.io/living_forest/dev/garden-login-test/

기본 확인 순서
1) 카카오로 내 정원 시작하기
2) 카카오 로그인 완료
3) 다시 정원 화면으로 돌아오는지 확인
4) 상단에 계정 이름이 표시되는지 확인
5) 마음 하나 저장 후 새로고침
6) 로그인 상태가 유지되는지 확인
7) 하단 로그아웃을 눌러 로그인 시작 화면으로 돌아오는지 확인
