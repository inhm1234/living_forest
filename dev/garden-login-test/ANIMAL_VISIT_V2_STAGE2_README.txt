TodayForest / living_forest
DEV Animal Visit v2 — Stage 2 screen connection

Scope
- DEV ONLY:
  dev/garden-login-test/index.html
  dev/garden-login-test/garden.css
  dev/garden-login-test/garden.js
- Does NOT include or change:
  /index.html, /style.css, /app.js, Code.gs, Cloudflare production files.

Required before upload
- SQL_GARDEN_DEV_ANIMAL_VISIT_V2_STAGE1.sql must already have run successfully.
- This screen patch calls:
  sync_my_garden_dev_animal_visits_v2()
  send_garden_letter_with_dev_animal_v2(...)
  send_dev_test_garden_letter_with_dev_animal_v2(...)

What this connects
- Up to two independent current animals from the DEV v2 visit rows.
- Small approach rustles, visiting animals, natural traces, and species-specific enter/exit motion.
- No permanent speech bubbles. A small envelope marker is shown instead.
- Clicking an animal opens a small card first; only “편지 맡기기” opens friend selection and writing.
- Sending a letter uses the atomic DEV v2 RPC, so the selected animal alone departs with the letter.
- Existing DEV decorations 12, friend decorations, coordinate-world drag storage, letters, shared tree, weather remain in place.

Browser checks after GitHub upload
1. After a fresh DEV opening, confirm the garden starts quiet or with a small rustle rather than an animal appearing immediately.
2. Keep it visible: a visit should appear after the server’s irregular delay.
3. If two animals overlap, both should be independently clickable.
4. Click one animal -> small card -> “편지 맡기기” -> send to a friend/test friend.
5. Only the chosen animal should leave; any second animal remains.
6. Refresh or open another device with the same account and confirm the same v2 visit state is shown.

Important
- The first-screen delay, dwell windows, overlap chance and five-minute change safeguard live in the already-applied DEV v2 SQL.
- This patch never calls the V1 animal visit RPCs.
