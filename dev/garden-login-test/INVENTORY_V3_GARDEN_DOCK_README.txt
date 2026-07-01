TODAYFOREST — INVENTORY V3 GARDEN DOCK

What changed
- The large list-style inventory interaction is no longer used while decorating.
- When decorating, the garden stays visible. A compact "꾸미는 중" bar appears inside the garden.
- Tap the basket to open a short drawer inside the garden. Tap an item to place it, then drag it where you want.
- Tap one placed decoration to reveal a small, local "보관함에 넣기" action next to that decoration.
- Only the selected decoration gets an outline. All decorations no longer show dashed boxes at once.
- Existing Supabase SQL / inventory state is unchanged. No SQL run is needed.

Files to upload
- dev/garden-login-test/index.html
- dev/garden-login-test/garden.js
- dev/garden-login-test/garden.css

Minimum QA
1. Tap "꾸미기": only a compact in-garden toolbar shows; no dashed boxes surround all decorations.
2. Tap one decoration: only that decoration gets a selected outline and a "보관함에 넣기" bubble.
3. Tap the basket: a small drawer opens inside the garden without hiding the garden.
4. Tap a stored item: it appears in the garden, the drawer closes, and the item can be dragged.
5. Tap "완료", refresh, and confirm the moved position remains.
