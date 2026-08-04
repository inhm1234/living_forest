import { DECORATION_RECIPE_CATALOG } from "./decoration-recipes.js?v=decoration-recipes-v1";

const BASIC_DECORATIONS = Object.freeze([
  { itemKey: "pink_wildflower", name: "분홍 들꽃", detail: "작은 들꽃이 나무 가까이에 피었어요.", asset: "assets/decorations/pink-wildflower.png" },
  { itemKey: "white_daisies", name: "하얀 데이지", detail: "하얀 데이지가 풀밭에 조용히 머물러요.", asset: "assets/decorations/white-daisies.png" },
  { itemKey: "mushroom_pair", name: "작은 버섯 두 개", detail: "작은 버섯 두 개가 나무 아래에 자랐어요.", asset: "assets/decorations/mushroom-pair.png" },
  { itemKey: "mossy_round_rock", name: "이끼 낀 둥근 돌", detail: "이끼 낀 둥근 돌이 숲길 곁에 놓였어요.", asset: "assets/decorations/mossy-round-rock.png" },
  { itemKey: "amber_mushroom", name: "주황 버섯", detail: "햇살빛 주황 버섯이 풀숲에서 고개를 내밀었어요.", asset: "assets/decorations/amber-mushroom.png" },
  { itemKey: "leafy_pile", name: "낙엽 더미", detail: "바람이 모아둔 낙엽이 포근하게 쌓였어요.", asset: "assets/decorations/leafy-pile.png" },
  { itemKey: "tiny_hedgehog", name: "작은 고슴도치", detail: "작은 고슴도치가 잠시 정원 가장자리에 쉬어가요.", asset: "assets/decorations/tiny-hedgehog.png" },
  { itemKey: "tiny_squirrel", name: "작은 다람쥐", detail: "작은 다람쥐가 도토리를 꼭 안고 앉았어요.", asset: "assets/decorations/tiny-squirrel.png" },
  { itemKey: "branch_letter", name: "낮은 가지의 봉투", detail: "낮은 가지에 작은 봉투 하나가 살며시 걸렸어요.", asset: "assets/decorations/branch-letter.png" },
  { itemKey: "forest_ribbon", name: "숲 리본", detail: "바람에 살랑이는 리본이 정원을 꾸며줘요.", asset: "assets/decorations/forest-ribbon.png" },
  { itemKey: "firefly_jar", name: "반딧불 병", detail: "작은 빛들이 유리병 안에서 조용히 반짝여요.", asset: "assets/decorations/firefly-jar.png" },
  { itemKey: "little_sign", name: "작은 표지판", detail: "숲길을 가리키는 작은 표지판이 세워졌어요.", asset: "assets/decorations/little-sign.png" },
]);

const CRAFTED_DECORATIONS = Object.freeze(
  DECORATION_RECIPE_CATALOG
    .filter((recipe) => recipe.enabled !== false)
    .map((recipe) => ({
      itemKey: recipe.result.itemKey,
      name: recipe.result.name,
      detail: recipe.result.detail,
      asset: recipe.result.asset,
      recipeName: recipe.name,
      crafted: true,
    }))
);

const ANIMALS = Object.freeze([
  {
    kind: "bird",
    name: "작은 새",
    asset: "assets/visitors/forest-bird-idle.svg",
    description: "가지 사이를 가볍게 오가며 숲의 소식을 가장 빠르게 전해주는 친구예요.",
    delivery: "편지를 약 2시간 동안 품고 날아가요.",
    trace: "깃털 하나를 남겨요.",
  },
  {
    kind: "squirrel",
    name: "다람쥐",
    asset: "assets/visitors/forest-squirrel-ground-idle.svg",
    description: "나무와 풀숲을 부지런히 오가며 정원을 살펴보는 친구예요.",
    delivery: "편지를 약 12시간 동안 정성껏 전해요.",
    trace: "도토리 하나를 남겨요.",
  },
  {
    kind: "rabbit",
    name: "토끼",
    asset: "assets/visitors/forest-rabbit-idle.svg",
    description: "풀밭에 조용히 머물며 작은 소리에도 귀를 기울이는 친구예요.",
    delivery: "편지를 약 6시간 동안 품고 달려가요.",
    trace: "풀잎에 작은 자국을 남겨요.",
  },
  {
    kind: "hedgehog",
    name: "고슴도치",
    asset: "assets/visitors/forest-hedgehog-idle.svg",
    description: "천천히 숲길을 걸으며 오래 머물다 가는 차분한 친구예요.",
    delivery: "편지를 약 24시간 동안 소중히 전해요.",
    trace: "작은 낙엽 길을 남겨요.",
  },
]);

const CODEX_RPC = "get_my_forest_codex_v1";
const SEEN_STORAGE_PREFIX = "todayforest-forest-codex-seen-v1";
let codexData = { decorations: [], animals: [] };
let codexUserId = "";
let activeTab = "decorations";
let isLoading = false;
let dialog = null;
let menuButton = null;

function supabaseClient() {
  return window.__todayForestSupabase || null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(date);
}

function decorationRows() {
  return new Map(
    (Array.isArray(codexData.decorations) ? codexData.decorations : [])
      .map((row) => [String(row?.item_key || ""), row])
      .filter(([key]) => key)
  );
}

function animalRows() {
  return new Map(
    (Array.isArray(codexData.animals) ? codexData.animals : [])
      .map((row) => [String(row?.animal_kind || ""), row])
      .filter(([key]) => key)
  );
}

function discoveredDecorationKeys() {
  const rows = decorationRows();
  return [...BASIC_DECORATIONS, ...CRAFTED_DECORATIONS]
    .filter((item) => Number(rows.get(item.itemKey)?.claim_count || 0) > 0)
    .map((item) => `decoration:${item.itemKey}`);
}

function discoveredAnimalKeys() {
  const rows = animalRows();
  return ANIMALS
    .filter((animal) => Number(rows.get(animal.kind)?.visit_count || 0) > 0)
    .map((animal) => `animal:${animal.kind}`);
}

function unlockedKeys() {
  return [...discoveredDecorationKeys(), ...discoveredAnimalKeys()].sort();
}

function seenStorageKey() {
  return `${SEEN_STORAGE_PREFIX}:${codexUserId || "guest"}`;
}

function readSeenKeys() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(seenStorageKey()) || "[]");
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch (_) {
    return new Set();
  }
}

function markCurrentKeysSeen() {
  if (!codexUserId) return;
  try {
    window.localStorage.setItem(seenStorageKey(), JSON.stringify(unlockedKeys()));
  } catch (_) {
    // 저장소가 막혀 있어도 도감 자체는 정상 작동합니다.
  }
  renderNewBadge();
}

function hasUnseenEntries() {
  const seen = readSeenKeys();
  return unlockedKeys().some((key) => !seen.has(key));
}

function renderNewBadge() {
  const hasNew = Boolean(codexUserId && hasUnseenEntries());
  menuButton?.classList.toggle("has-codex-new", hasNew);
  const badge = menuButton?.querySelector("[data-codex-new-badge]");
  if (badge) badge.hidden = !hasNew;
}

function ensureDialog() {
  if (dialog) return dialog;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="forest-codex-backdrop" id="forestCodexDialog" hidden>
      <section class="forest-codex-dialog" role="dialog" aria-modal="true" aria-labelledby="forestCodexTitle">
        <header class="forest-codex-header">
          <div>
            <p class="forest-codex-kicker">이 숲에서 만난 작은 기억</p>
            <h2 id="forestCodexTitle">숲 도감</h2>
          </div>
          <button class="forest-codex-close" type="button" aria-label="숲 도감 닫기">×</button>
        </header>
        <nav class="forest-codex-tabs" aria-label="숲 도감 종류">
          <button type="button" data-codex-tab="decorations" aria-selected="true">작은 것</button>
          <button type="button" data-codex-tab="animals" aria-selected="false">숲친구</button>
        </nav>
        <div class="forest-codex-body" data-codex-body aria-live="polite"></div>
      </section>
    </div>
  `;
  dialog = wrapper.firstElementChild;
  document.body.append(dialog);

  dialog.querySelector(".forest-codex-close")?.addEventListener("click", closeCodex);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeCodex();
  });
  dialog.querySelectorAll("[data-codex-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.codexTab === "animals" ? "animals" : "decorations";
      renderDialog();
    });
  });
  return dialog;
}

function lockedCard({ asset, animal = false } = {}) {
  return `
    <article class="forest-codex-card is-locked">
      <div class="forest-codex-art ${animal ? "is-animal" : ""}">
        <img src="${escapeHtml(asset)}" alt="" />
        <span class="forest-codex-lock" aria-hidden="true">?</span>
      </div>
      <div class="forest-codex-card-copy">
        <h4>???</h4>
        <p>아직 이 숲에서 만나지 못했어요.</p>
      </div>
    </article>
  `;
}

function decorationCard(item, row) {
  const claimCount = Number(row?.claim_count || 0);
  if (claimCount < 1) return lockedCard({ asset: item.asset });

  const placedCount = Number(row?.placed_count || 0);
  const inventoryCount = Number(row?.inventory_count || 0);
  const currentCount = Number(row?.current_count || 0);
  const firstDate = formatDate(row?.first_discovered_at);
  const stateParts = [];
  if (placedCount > 0) stateParts.push(`정원 ${placedCount}개`);
  if (inventoryCount > 0) stateParts.push(`보관함 ${inventoryCount}개`);
  if (!stateParts.length && currentCount < 1) stateParts.push("지금은 추억으로 남아 있어요");

  return `
    <article class="forest-codex-card is-unlocked">
      <div class="forest-codex-art">
        <img src="${escapeHtml(item.asset)}" alt="${escapeHtml(item.name)}" />
      </div>
      <div class="forest-codex-card-copy">
        <p class="forest-codex-card-label">${item.crafted ? "직접 만든 특별장식" : "숲에서 발견한 작은 것"}</p>
        <h4>${escapeHtml(item.name)}</h4>
        <p>${escapeHtml(item.detail)}</p>
        <dl class="forest-codex-facts">
          ${firstDate ? `<div><dt>처음 발견</dt><dd>${escapeHtml(firstDate)}</dd></div>` : ""}
          <div><dt>발견 기록</dt><dd>${claimCount}번</dd></div>
          <div><dt>현재</dt><dd>${escapeHtml(stateParts.join(" · "))}</dd></div>
        </dl>
      </div>
    </article>
  `;
}

function animalCard(animal, row) {
  const visitCount = Number(row?.visit_count || 0);
  if (visitCount < 1) return lockedCard({ asset: animal.asset, animal: true });
  const firstDate = formatDate(row?.first_seen_at);

  return `
    <article class="forest-codex-card is-unlocked is-animal-card">
      <div class="forest-codex-art is-animal">
        <img src="${escapeHtml(animal.asset)}" alt="${escapeHtml(animal.name)}" />
      </div>
      <div class="forest-codex-card-copy">
        <p class="forest-codex-card-label">정원에 찾아온 숲친구</p>
        <h4>${escapeHtml(animal.name)}</h4>
        <p>${escapeHtml(animal.description)}</p>
        <p class="forest-codex-animal-note">${escapeHtml(animal.delivery)} ${escapeHtml(animal.trace)}</p>
        <dl class="forest-codex-facts">
          ${firstDate ? `<div><dt>처음 만난 날</dt><dd>${escapeHtml(firstDate)}</dd></div>` : ""}
          <div><dt>방문 기록</dt><dd>${visitCount}번</dd></div>
        </dl>
      </div>
    </article>
  `;
}

function renderDecorations() {
  const rows = decorationRows();
  const basicUnlocked = BASIC_DECORATIONS.filter((item) => Number(rows.get(item.itemKey)?.claim_count || 0) > 0).length;
  const craftedUnlocked = CRAFTED_DECORATIONS.filter((item) => Number(rows.get(item.itemKey)?.claim_count || 0) > 0).length;
  const totalUnlocked = basicUnlocked + craftedUnlocked;
  const total = BASIC_DECORATIONS.length + CRAFTED_DECORATIONS.length;

  return `
    <section class="forest-codex-summary">
      <div><b>${totalUnlocked}</b><span>/ ${total} 발견</span></div>
      <p>한 번 발견한 작은 것은 사용하거나 보관함에서 꺼내도 도감에 계속 남아요.</p>
    </section>
    <section class="forest-codex-section">
      <div class="forest-codex-section-title">
        <div><h3>숲에서 찾은 작은 것</h3><p>${basicUnlocked} / ${BASIC_DECORATIONS.length}</p></div>
      </div>
      <div class="forest-codex-grid">
        ${BASIC_DECORATIONS.map((item) => decorationCard(item, rows.get(item.itemKey))).join("")}
      </div>
    </section>
    <section class="forest-codex-section">
      <div class="forest-codex-section-title">
        <div><h3>직접 만든 특별장식</h3><p>${craftedUnlocked} / ${CRAFTED_DECORATIONS.length}</p></div>
      </div>
      <div class="forest-codex-grid">
        ${CRAFTED_DECORATIONS.map((item) => decorationCard(item, rows.get(item.itemKey))).join("")}
      </div>
    </section>
  `;
}

function renderAnimals() {
  const rows = animalRows();
  const unlocked = ANIMALS.filter((animal) => Number(rows.get(animal.kind)?.visit_count || 0) > 0).length;

  return `
    <section class="forest-codex-summary">
      <div><b>${unlocked}</b><span>/ ${ANIMALS.length} 만남</span></div>
      <p>기척만 느껴진 때가 아니라, 숲친구가 실제로 정원에 도착하면 기록이 열려요.</p>
    </section>
    <section class="forest-codex-section">
      <div class="forest-codex-grid">
        ${ANIMALS.map((animal) => animalCard(animal, rows.get(animal.kind))).join("")}
      </div>
    </section>
    <p class="forest-codex-history-note">숲친구의 영구 방문 기록은 숲 도감이 생긴 뒤부터 차곡차곡 쌓여요.</p>
  `;
}

function renderDialog() {
  const root = ensureDialog();
  root.querySelectorAll("[data-codex-tab]").forEach((button) => {
    const selected = button.dataset.codexTab === activeTab;
    button.setAttribute("aria-selected", String(selected));
    button.classList.toggle("is-active", selected);
  });

  const body = root.querySelector("[data-codex-body]");
  if (!body) return;
  if (isLoading) {
    body.innerHTML = `<div class="forest-codex-loading"><span aria-hidden="true">🌿</span><p>숲의 기록을 펼치고 있어요…</p></div>`;
    return;
  }
  body.innerHTML = activeTab === "animals" ? renderAnimals() : renderDecorations();
}

async function fetchCodex({ quiet = false } = {}) {
  const supabase = supabaseClient();
  if (!supabase || isLoading) return false;
  isLoading = true;
  if (!quiet) renderDialog();

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user || null;
    codexUserId = user?.id || "";
    if (!codexUserId) return false;

    const { data, error } = await supabase.rpc(CODEX_RPC);
    if (error) throw error;
    codexData = {
      decorations: Array.isArray(data?.decorations) ? data.decorations : [],
      animals: Array.isArray(data?.animals) ? data.animals : [],
    };
    renderNewBadge();
    return true;
  } catch (error) {
    console.warn("TodayForest forest codex load skipped:", error);
    if (!quiet) {
      const body = ensureDialog().querySelector("[data-codex-body]");
      if (body) {
        body.innerHTML = `
          <div class="forest-codex-error">
            <span aria-hidden="true">🍂</span>
            <p>숲의 기록을 불러오지 못했어요.</p>
            <button type="button" data-codex-retry>다시 펼쳐보기</button>
          </div>
        `;
        body.querySelector("[data-codex-retry]")?.addEventListener("click", () => { void fetchCodex(); });
      }
    }
    return false;
  } finally {
    isLoading = false;
    if (!quiet && !ensureDialog().querySelector(".forest-codex-error")) renderDialog();
  }
}

async function openCodex() {
  const root = ensureDialog();
  root.hidden = false;
  document.body.classList.add("forest-codex-open");
  renderDialog();
  const loaded = await fetchCodex();
  if (loaded) markCurrentKeysSeen();
  root.querySelector(".forest-codex-close")?.focus();
}

function closeCodex() {
  if (!dialog || dialog.hidden) return;
  dialog.hidden = true;
  document.body.classList.remove("forest-codex-open");
  menuButton?.focus();
}

function closeMoreMenu() {
  const panel = document.querySelector("#moreMenuPanel");
  const opener = document.querySelector("#openMoreMenu");
  panel?.classList.add("hidden");
  opener?.classList.remove("is-open");
  opener?.setAttribute("aria-expanded", "false");
}

function install() {
  menuButton = document.querySelector('[data-more-action="codex"]');
  if (!menuButton) return;
  ensureDialog();
  menuButton.addEventListener("click", () => {
    closeMoreMenu();
    void openCodex();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dialog && !dialog.hidden) closeCodex();
  });
  window.addEventListener("todayforest:garden-session-ready", () => { void fetchCodex({ quiet: true }); });
  window.setTimeout(() => { void fetchCodex({ quiet: true }); }, 1200);
}

install();
