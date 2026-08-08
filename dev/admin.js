// Legacy DEV dashboard disabled on 2026-08-08.
//
// This page previously used a password embedded in browser JavaScript. A client-side
// password is never an authentication boundary because anyone who can load the JS
// can read it. Keep this file secret-free even though /dev is excluded from the
// production build.
//
// Use the production-safe admin surfaces instead. Their authorization must be
// enforced server-side (for example through Supabase/RLS/RPC), not by a JS constant.
const message = document.querySelector('#loginMessage');
const loginButton = document.querySelector('#loginButton');
const passwordInput = document.querySelector('#adminPassword');

if (passwordInput) {
  passwordInput.value = '';
  passwordInput.disabled = true;
  passwordInput.placeholder = '레거시 DEV 로그인 비활성화됨';
}

if (loginButton) {
  loginButton.disabled = true;
}

if (message) {
  message.textContent = '이 DEV 관리자 로그인은 보안상 비활성화되었습니다. 운영 관리자 페이지를 사용하세요.';
}
