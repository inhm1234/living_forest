import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./todayforest-supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: "pkce" },
});

const state = {
  user: null,
  card: null,
  loading: false,
  saveBusy: false,
  modal: null,
  quickCards: [],
  recordedKeys: new Set(),
};

const METRICS = [
  ["calculation", "계산 선택"],
  ["distance", "거리 감각"],
  ["stop", "정지 판단"],
  ["resource", "운영력"],
  ["time", "시간 관리"],
  ["consistency", "안정성"],
];

const DIFFICULTY_LABELS = { easy: "쉬움", normal: "보통", hard: "어려움" };
const MODE_LABELS = { squirrel: "다람쥐", friend: "친구", random: "랜덤" };
const RESULT_LABELS = { win: "승", draw: "무", lose: "패" };

function clamp(value, min = 0, max = 100) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function intValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function average(values, fallback = 0) {
  const clean = values.map(Number).filter(Number.isFinite);
  if (!clean.length) return fallback;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[char]));
}

function currentNickname() {
  const metadata = state.user?.user_metadata || {};
  return metadata.nickname || metadata.name || metadata.full_name || state.user?.email?.split("@")[0] || "숲의 플레이어";
}

function currentAvatar() {
  const metadata = state.user?.user_metadata || {};
  return metadata.avatar_url || metadata.picture || "";
}

async function rpc(name, params = {}) {
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw error;
  return Array.isArray(data) ? (data[0] || null) : data;
}

function emptyStats() {
  return { games: 0, wins: 0, draws: 0, losses: 0, winRate: 0 };
}

function normalizeStats(value) {
  const row = value && typeof value === "object" ? value : {};
  return {
    games: intValue(row.games), wins: intValue(row.wins), draws: intValue(row.draws), losses: intValue(row.losses),
    winRate: Number.isFinite(Number(row.winRate)) ? Number(row.winRate) : 0,
  };
}

function normalizeCard(value) {
  const row = value && typeof value === "object" ? value : {};
  const radar = row.radar && typeof row.radar === "object" ? row.radar : {};
  const behavior = row.behavior && typeof row.behavior === "object" ? row.behavior : {};
  return {
    profile: {
      tagline: String(row.profile?.tagline || ""),
      statsVisibility: row.profile?.statsVisibility === "private" ? "private" : "friends",
    },
    acorns: Math.max(0, intValue(row.acorns)),
    practice: normalizeStats(row.practice),
    people: normalizeStats(row.people),
    friend: normalizeStats(row.friend),
    random: normalizeStats(row.random),
    practiceByDifficulty: row.practiceByDifficulty && typeof row.practiceByDifficulty === "object" ? row.practiceByDifficulty : {},
    radar: {
      sampleCount: intValue(radar.sampleCount),
      calculation: radar.calculation == null ? null : clamp(radar.calculation),
      distance: radar.distance == null ? null : clamp(radar.distance),
      stop: radar.stop == null ? null : clamp(radar.stop),
      resource: radar.resource == null ? null : clamp(radar.resource),
      time: radar.time == null ? null : clamp(radar.time),
      consistency: radar.consistency == null ? null : clamp(radar.consistency),
    },
    behavior: {
      sampleCount: intValue(behavior.sampleCount),
      avgOperations: Number(behavior.avgOperations || 0),
      avgDraws: Number(behavior.avgDraws || 0),
      avgFinalDistance: Number(behavior.avgFinalDistance || 0),
      manualStopRate: Number(behavior.manualStopRate || 0),
      timeoutRate: Number(behavior.timeoutRate || 0),
      divisionRemainderUses: intValue(behavior.divisionRemainderUses),
    },
    recentGames: Array.isArray(row.recentGames) ? row.recentGames : [],
  };
}

function styleProfile(card) {
  const radar = card?.radar || {};
  const behavior = card?.behavior || {};
  const samples = intValue(radar.sampleCount);
  if (samples < 3) {
    return { name: "기록을 모으는 새싹", icon: "🌱", text: "몇 판 더 플레이하면 계산 습관과 승부 성향이 선명해져요." };
  }
  if (behavior.timeoutRate >= 18) {
    return { name: "깊이 생각하는 탐색가", icon: "🪵", text: "가능한 수를 오래 비교하는 편이에요. 좋은 판단을 조금 더 일찍 확정하면 강점이 살아나요." };
  }
  if (behavior.manualStopRate >= 55 && behavior.avgFinalDistance <= 3.2) {
    return { name: "신중한 설계자", icon: "🍃", text: "좋은 거리를 만든 뒤 승부를 굳히는 판단이 돋보여요." };
  }
  if (behavior.avgDraws >= 0.85 || behavior.avgOperations >= 2.9) {
    return { name: "과감한 추격자", icon: "🔥", text: "불리한 거리를 계산으로 뒤집으려는 성향이 강해요. 역전력이 좋은 대신 멈출 타이밍이 중요해요." };
  }
  if (Number(radar.calculation || 0) >= 78 && Number(radar.resource || 0) >= 70) {
    return { name: "수식 설계자", icon: "🧠", text: "손에 있는 수식과 숫자를 비교해 효율적인 길을 찾는 편이에요." };
  }
  if (Number(radar.consistency || 0) >= 78) {
    return { name: "균형 잡힌 운영가", icon: "🌿", text: "특정 한 방보다 여러 판에서 안정적으로 좋은 거리를 만드는 편이에요." };
  }
  return { name: "숲길을 읽는 탐험가", icon: "🧭", text: "계산과 승부 판단이 한쪽으로 치우치지 않은 균형형 플레이예요." };
}

function metricScore(card, key) {
  const value = card?.radar?.[key];
  return value == null ? null : clamp(value);
}

function adviceForCard(card) {
  const samples = intValue(card?.radar?.sampleCount);
  if (samples < 3) {
    return {
      headline: "우선 3판 정도 기록을 모아보세요.",
      body: "승패만 보는 게 아니라 어떤 계산을 골랐고 언제 멈췄는지까지 쌓이면 맞춤 조언이 시작돼요.",
      strength: "아직 성급하게 실력을 단정하지 않을게요.",
    };
  }

  const scored = METRICS
    .map(([key, label]) => ({ key, label, value: metricScore(card, key) }))
    .filter((item) => item.value !== null)
    .sort((a, b) => a.value - b.value);
  const weakest = scored[0] || { key: "distance", label: "거리 감각", value: 50 };
  const strongest = scored[scored.length - 1] || weakest;
  const behavior = card.behavior || {};

  const adviceMap = {
    calculation: "카드를 내기 전에 가능한 수식×숫자 조합을 한 번 더 비교해보세요. 지금 선택보다 남은 카드의 거리를 더 줄이는 수가 있는지 확인하는 습관이 가장 큰 개선점이에요.",
    distance: "현재 결과값 자체보다 ‘내 손에 남길 카드와의 거리’를 먼저 보세요. 좋은 숫자를 만드는 것과 좋은 거리를 만드는 것은 조금 달라요.",
    stop: behavior.avgDraws >= 0.6
      ? "이미 거리 1~2까지 좁혀진 상황에서는 한 장 더 받는 이득보다 거리가 망가질 위험을 먼저 비교해보세요. 좋은 판을 지키는 스톱이 승률을 올려줘요."
      : "스톱할 수 있는 순간마다 현재 거리와 남은 수식의 위험도를 함께 비교해보세요. 멈추는 판단도 계산의 일부예요.",
    resource: "초반에 수식카드를 몰아 쓰기보다, 마지막 한 번의 미세 조정을 위해 쉬운 수식을 남겨두는 운영을 연습해보세요.",
    time: "완벽한 수를 끝까지 찾기보다 10초가 남기 전에 후보를 2개로 줄이고 결정하는 루틴을 만들어보세요. 시간 종료는 좋은 계산도 무효로 만들 수 있어요.",
    consistency: "한 판의 멋진 역전보다 비슷한 상황에서 같은 기준으로 판단하는 연습이 필요해요. 특히 ‘거리 몇이면 멈출지’ 자기 기준을 하나 정해보세요.",
  };

  return {
    headline: `${weakest.label}을 조금만 다듬으면 다음 단계로 올라가기 좋아요.`,
    body: adviceMap[weakest.key],
    strength: `${strongest.label}은 현재 가장 안정적인 강점이에요. (${Math.round(strongest.value)}점)`,
  };
}

function scorePayloadFromSolo(detail) {
  const history = Array.isArray(detail.history) ? detail.history : [];
  const performance = detail.performance && typeof detail.performance === "object" ? detail.performance : {};
  const calculations = history.filter((item) => item?.player === "human" && item?.type === "calculation");
  const choiceScores = calculations.map((item) => Number(item.choiceScore)).filter(Number.isFinite);
  const finalDistance = Math.max(0, intValue(detail.myDistance));
  const operationsUsed = calculations.length;
  const drawsUsed = Math.max(0, intValue(performance.draws));
  const recordedTimeouts = intValue(performance.timeouts, -1);
  const timeouts = Math.max(0, recordedTimeouts >= 0 ? recordedTimeouts : calculations.filter((item) => item.timedOut).length);
  const responseTimes = Array.isArray(performance.responseTimesMs) ? performance.responseTimesMs.map(Number).filter(Number.isFinite) : [];
  const avgDecisionMs = responseTimes.length ? Math.round(average(responseTimes)) : null;
  const drawDistances = Array.isArray(performance.drawDistances) ? performance.drawDistances.map(Number).filter(Number.isFinite) : [];
  const manualStop = Boolean(performance.manualStop);
  const stopDistance = performance.stopDistance == null ? null : Math.max(0, intValue(performance.stopDistance));
  const divisionRemainderUses = calculations.filter((item) => item.operation === "÷" && Number(item.before) % Number(item.number) !== 0).length;

  const calculationScore = Math.round(clamp(choiceScores.length ? average(choiceScores) : 60));
  const distanceScore = Math.round(clamp(100 - finalDistance * 12));

  let stopScore = 80;
  drawDistances.forEach((distance) => {
    if (distance <= 1) stopScore -= 24;
    else if (distance <= 2) stopScore -= 15;
    else if (distance <= 3) stopScore -= 6;
  });
  if (manualStop && stopDistance !== null) stopScore = (stopScore + clamp(100 - stopDistance * 11)) / 2;
  if (performance.autoStopTimedOut) stopScore -= 28;
  stopScore = Math.round(clamp(stopScore));

  const resourceScore = Math.round(clamp(92 - drawsUsed * 10 - Math.max(0, operationsUsed - 3) * 4 - divisionRemainderUses * 3 + (finalDistance <= 2 ? 7 : 0)));
  const timeScore = Math.round(clamp(100 - timeouts * 32 - (avgDecisionMs == null ? 0 : Math.max(0, avgDecisionMs - 6000) / 420)));

  return {
    finalValue: intValue(detail.finalValue),
    finalDistance,
    opponentDistance: Math.max(0, intValue(detail.opponentDistance)),
    operationsUsed,
    drawsUsed,
    manualStop,
    stopDistance,
    timeouts,
    avgDecisionMs,
    divisionRemainderUses,
    calculationScore,
    distanceScore,
    stopScore,
    resourceScore,
    timeScore,
    drawDistances: drawDistances.slice(0, 8),
  };
}

function scorePayloadFromPlayer(detail) {
  const actions = Array.isArray(detail.actions) ? detail.actions : [];
  const myId = String(detail.userId || state.user?.id || "");
  const myTarget = intValue(detail.myTarget, 0);
  const mine = actions.filter((action) => String(action?.actorId || "") === myId);
  const calculations = mine.filter((action) => ["calculation", "timeout_auto_calculation"].includes(action?.type));
  const draws = mine.filter((action) => action?.type === "draw");
  const stops = mine.filter((action) => ["stop", "timeout_auto_stop"].includes(action?.type));
  const timeouts = mine.filter((action) => Boolean(action?.isTimeout) || String(action?.type || "").startsWith("timeout_auto_")).length;

  const choiceScores = calculations.map((action) => {
    const before = Math.abs(myTarget - Number(action.beforeValue || 0));
    const after = Math.abs(myTarget - Number(action.afterValue || 0));
    const improvement = before - after;
    return clamp(68 + improvement * 9);
  });

  let currentValue = null;
  const drawDistances = [];
  let stopDistance = null;
  actions.forEach((action) => {
    if (["opening", "timeout_auto_opening"].includes(action?.type)) currentValue = Number(action.numberCard);
    if (["calculation", "timeout_auto_calculation"].includes(action?.type)) currentValue = Number(action.afterValue);
    if (String(action?.actorId || "") !== myId) return;
    if (action?.type === "draw" && Number.isFinite(currentValue)) drawDistances.push(Math.abs(myTarget - currentValue));
    if (["stop", "timeout_auto_stop"].includes(action?.type) && Number.isFinite(currentValue)) stopDistance = Math.abs(myTarget - currentValue);
  });

  const finalDistance = Math.max(0, intValue(detail.myDistance));
  const divisionRemainderUses = calculations.filter((action) => action.operation === "÷" && Number(action.beforeValue) % Number(action.numberCard) !== 0).length;
  const manualStop = stops.some((action) => action.type === "stop" && !action.isTimeout);
  let stopScore = 78;
  drawDistances.forEach((distance) => {
    if (distance <= 1) stopScore -= 24;
    else if (distance <= 2) stopScore -= 14;
    else if (distance <= 3) stopScore -= 6;
  });
  if (manualStop && stopDistance !== null) stopScore = (stopScore + clamp(100 - stopDistance * 11)) / 2;
  if (stops.some((action) => action.type === "timeout_auto_stop" || action.isTimeout)) stopScore -= 28;

  return {
    finalValue: intValue(detail.finalValue),
    finalDistance,
    opponentDistance: Math.max(0, intValue(detail.opponentDistance)),
    operationsUsed: calculations.length,
    drawsUsed: draws.length,
    manualStop,
    stopDistance,
    timeouts,
    avgDecisionMs: null,
    divisionRemainderUses,
    calculationScore: Math.round(clamp(choiceScores.length ? average(choiceScores) : 62)),
    distanceScore: Math.round(clamp(100 - finalDistance * 12)),
    stopScore: Math.round(clamp(stopScore)),
    resourceScore: Math.round(clamp(92 - draws.length * 10 - Math.max(0, calculations.length - 3) * 4 - divisionRemainderUses * 3 + (finalDistance <= 2 ? 7 : 0))),
    timeScore: Math.round(clamp(100 - timeouts * 35)),
    drawDistances: drawDistances.slice(0, 8),
  };
}

function radarPoints(card) {
  const center = 100;
  const radius = 67;
  return METRICS.map(([key], index) => {
    const angle = (-90 + index * 60) * Math.PI / 180;
    const value = metricScore(card, key) ?? 0;
    const r = radius * value / 100;
    return `${(center + Math.cos(angle) * r).toFixed(1)},${(center + Math.sin(angle) * r).toFixed(1)}`;
  }).join(" ");
}

function ringPoints(ratio) {
  const center = 100;
  const radius = 67 * ratio;
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (-90 + index * 60) * Math.PI / 180;
    return `${(center + Math.cos(angle) * radius).toFixed(1)},${(center + Math.sin(angle) * radius).toFixed(1)}`;
  }).join(" ");
}

function recentMarkup(card) {
  if (!card.recentGames.length) return '<p class="ootpc-empty-copy">아직 분석할 플레이 기록이 없어요. 다음 대전부터 차곡차곡 쌓여요.</p>';
  return card.recentGames.map((game) => {
    const mode = MODE_LABELS[game.mode] || "대전";
    const extra = game.mode === "squirrel" && game.difficulty ? ` · ${DIFFICULTY_LABELS[game.difficulty] || game.difficulty}` : "";
    const result = RESULT_LABELS[game.result] || "-";
    return `<span class="ootpc-recent-item is-${escapeHtml(game.result || "draw")}"><b>${result}</b><span>${mode}${extra}</span><small>거리 ${intValue(game.finalDistance)}</small></span>`;
  }).join("");
}

function difficultyMarkup(card) {
  const rows = ["easy", "normal", "hard"].map((key) => {
    const stats = normalizeStats(card.practiceByDifficulty[key]);
    if (!stats.games) return "";
    const rate = Math.round(stats.wins / Math.max(1, stats.games) * 100);
    return `<span><b>${DIFFICULTY_LABELS[key]}</b><em>${stats.games}전 ${stats.wins}승 · ${rate}%</em></span>`;
  }).filter(Boolean);
  return rows.length ? rows.join("") : '<small>난이도별 기록도 다음 연습부터 쌓여요.</small>';
}

function statsBlock(title, stats, subline = "") {
  return `<article class="ootpc-stat-block"><small>${title}</small><strong>${stats.games}<i>판</i></strong><b>${stats.wins}승 ${stats.draws}무 ${stats.losses}패</b><span>승률 ${Number(stats.winRate || 0).toFixed(1)}%</span>${subline ? `<em>${subline}</em>` : ""}</article>`;
}

function ensureModal() {
  if (state.modal) return state.modal;
  const root = document.createElement("div");
  root.className = "ootpc-overlay is-hidden";
  root.id = "ootPlayerCardOverlay";
  root.innerHTML = `
    <div class="ootpc-modal" role="dialog" aria-modal="true" aria-labelledby="ootpcTitle">
      <header class="ootpc-modal-head">
        <div><small>ONE OF TEN PLAYER CARD</small><h2 id="ootpcTitle">내 플레이 카드</h2></div>
        <button type="button" data-ootpc-close aria-label="플레이 카드 닫기">×</button>
      </header>
      <div class="ootpc-modal-body" data-ootpc-content></div>
    </div>`;
  document.body.append(root);
  root.addEventListener("click", (event) => {
    if (event.target === root || event.target.closest("[data-ootpc-close]")) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !root.classList.contains("is-hidden")) closeModal();
  });
  state.modal = root;
  return root;
}

function openModal() {
  const modal = ensureModal();
  renderModal();
  modal.classList.remove("is-hidden");
  document.body.classList.add("ootpc-open");
}

function closeModal() {
  state.modal?.classList.add("is-hidden");
  document.body.classList.remove("ootpc-open");
}

function renderModal() {
  const modal = ensureModal();
  const target = modal.querySelector("[data-ootpc-content]");
  if (!state.user) {
    target.innerHTML = '<section class="ootpc-login-note"><span>🔐</span><strong>로그인하면 내 기록이 쌓여요.</strong><p>다람쥐 연습도 로그인한 상태에서 플레이하면 육각형 분석에 반영돼요.</p><a href="app.html">내 정원에서 로그인하기</a></section>';
    return;
  }
  if (!state.card) {
    target.innerHTML = '<section class="ootpc-loading"><span>🌿</span><p>플레이 기록을 불러오고 있어요.</p></section>';
    return;
  }

  const card = state.card;
  const style = styleProfile(card);
  const advice = adviceForCard(card);
  const nickname = currentNickname();
  const avatar = currentAvatar();
  const sampleCount = intValue(card.radar.sampleCount);
  const friendSub = `${card.friend.games} 친구 · ${card.random.games} 랜덤`;
  const visibility = card.profile.statsVisibility;

  target.innerHTML = `
    <section class="ootpc-identity">
      <span class="ootpc-avatar">${avatar ? `<img src="${escapeHtml(avatar)}" alt="" />` : escapeHtml(nickname.slice(0, 1))}</span>
      <div><small>MY NUMBER STYLE</small><h3>${escapeHtml(nickname)}</h3><p>${escapeHtml(card.profile.tagline || "아직 한마디를 정하지 않았어요.")}</p></div>
      <span class="ootpc-acorns" title="보유 도토리">🌰 <b>${card.acorns}</b></span>
    </section>

    <section class="ootpc-style-card">
      <span>${style.icon}</span><div><small>플레이 성향</small><h3>${style.name}</h3><p>${style.text}</p></div>
    </section>

    <section class="ootpc-stat-grid">
      ${statsBlock("다람쥐 연습", card.practice, "난이도별 기록은 아래에서 확인")}
      ${statsBlock("사람 대전", card.people, friendSub)}
    </section>

    <section class="ootpc-analysis-grid">
      <article class="ootpc-radar-card">
        <header><div><small>PLAY HEXAGON</small><h3>나의 육각형</h3></div><span>${sampleCount}판 분석</span></header>
        <div class="ootpc-radar-wrap${sampleCount ? "" : " is-empty"}">
          <svg viewBox="0 0 200 200" role="img" aria-label="원오브텐 육각형 능력치">
            <polygon class="ootpc-ring" points="${ringPoints(1)}"></polygon>
            <polygon class="ootpc-ring" points="${ringPoints(.66)}"></polygon>
            <polygon class="ootpc-ring" points="${ringPoints(.33)}"></polygon>
            ${Array.from({ length: 6 }, (_, index) => {
              const angle = (-90 + index * 60) * Math.PI / 180;
              return `<line class="ootpc-axis" x1="100" y1="100" x2="${(100 + Math.cos(angle) * 67).toFixed(1)}" y2="${(100 + Math.sin(angle) * 67).toFixed(1)}"></line>`;
            }).join("")}
            <polygon class="ootpc-radar-shape" points="${radarPoints(card)}"></polygon>
            ${METRICS.map(([key], index) => {
              const angle = (-90 + index * 60) * Math.PI / 180;
              const value = metricScore(card, key) ?? 0;
              const r = 67 * value / 100;
              return `<circle class="ootpc-radar-dot" cx="${(100 + Math.cos(angle) * r).toFixed(1)}" cy="${(100 + Math.sin(angle) * r).toFixed(1)}" r="3"></circle>`;
            }).join("")}
          </svg>
          <span class="is-top">계산 선택</span><span class="is-ur">거리 감각</span><span class="is-lr">정지 판단</span>
          <span class="is-bottom">운영력</span><span class="is-ll">시간 관리</span><span class="is-ul">안정성</span>
        </div>
        <div class="ootpc-metric-list">
          ${METRICS.map(([key, label]) => `<span><b>${label}</b><em>${metricScore(card, key) == null ? "분석 중" : Math.round(metricScore(card, key))}</em></span>`).join("")}
        </div>
        ${sampleCount < 3 ? '<p class="ootpc-analysis-note">3판부터 안정성까지 포함한 성향 분석이 시작돼요.</p>' : ""}
      </article>

      <article class="ootpc-coach-card">
        <header><small>PLAY ADVICE</small><h3>이번 플레이 조언</h3></header>
        <strong>${escapeHtml(advice.headline)}</strong>
        <p>${escapeHtml(advice.body)}</p>
        <span>강점 · ${escapeHtml(advice.strength)}</span>
        <dl>
          <div><dt>평균 계산</dt><dd>${Number(card.behavior.avgOperations || 0).toFixed(1)}회</dd></div>
          <div><dt>카드 받기</dt><dd>${Number(card.behavior.avgDraws || 0).toFixed(1)}회</dd></div>
          <div><dt>평균 최종 거리</dt><dd>${Number(card.behavior.avgFinalDistance || 0).toFixed(1)}</dd></div>
          <div><dt>시간 종료 경기</dt><dd>${Number(card.behavior.timeoutRate || 0).toFixed(1)}%</dd></div>
        </dl>
      </article>
    </section>

    <section class="ootpc-detail-grid">
      <article class="ootpc-detail-card"><header><small>PRACTICE</small><h3>연습 난이도</h3></header><div class="ootpc-difficulty-list">${difficultyMarkup(card)}</div></article>
      <article class="ootpc-detail-card"><header><small>RECENT</small><h3>최근 분석 기록</h3></header><div class="ootpc-recent-list">${recentMarkup(card)}</div></article>
    </section>

    <section class="ootpc-profile-settings">
      <header><div><small>PROFILE</small><h3>프로필 설정</h3></div><span>친구 카드 연결을 위한 기본 설정</span></header>
      <label>프로필 한마디<input type="text" maxlength="40" data-ootpc-tagline value="${escapeHtml(card.profile.tagline)}" placeholder="예: 좋은 거리에서는 멈출 줄 아는 사람" /></label>
      <label>전적 공개<select data-ootpc-visibility><option value="friends"${visibility === "friends" ? " selected" : ""}>친구에게 공개</option><option value="private"${visibility === "private" ? " selected" : ""}>나만 보기</option></select></label>
      <button type="button" data-ootpc-save>설정 저장</button>
      <p data-ootpc-save-status>친구가 내 플레이 카드를 보는 기능은 다음 연결에서 이 설정을 사용해요.</p>
    </section>`;

  const saveButton = target.querySelector("[data-ootpc-save]");
  saveButton?.addEventListener("click", saveProfile);
}

function quickCardMarkup({ compact = false } = {}) {
  const card = state.card;
  const signedIn = Boolean(state.user);
  const style = card ? styleProfile(card) : null;
  const practice = card?.practice || emptyStats();
  const people = card?.people || emptyStats();
  const total = practice.games + people.games;
  const winRate = people.games ? people.winRate : practice.winRate;
  const label = !signedIn ? "로그인하면 기록 시작" : !card ? "기록을 불러오는 중" : style.name;
  return `<button class="ootpc-quick${compact ? " is-compact" : ""}" type="button" data-ootpc-open>
    <span class="ootpc-quick-icon">${style?.icon || (signedIn ? "🌱" : "🔐")}</span>
    <span class="ootpc-quick-copy"><small>MY ONE OF TEN</small><strong>내 플레이 카드</strong><em>${escapeHtml(label)}</em></span>
    <span class="ootpc-quick-stats"><b>${total}<small>판</small></b><span>승률 ${Number(winRate || 0).toFixed(1)}%</span></span>
    <span class="ootpc-quick-acorn">🌰 ${card ? card.acorns : signedIn ? "…" : "-"}</span>
    <i aria-hidden="true">›</i>
  </button>`;
}

function createQuickCards() {
  const anchors = [];
  const modeGrid = document.querySelector(".oot-mode-choice-grid");
  if (modeGrid) anchors.push({ parent: modeGrid.parentElement, after: modeGrid, compact: false, key: "solo-home" });
  const matchContext = document.querySelector("#matchContext");
  if (matchContext) anchors.push({ parent: matchContext.parentElement, after: matchContext, compact: true, key: "solo-game" });
  const friendHero = document.querySelector(".ootf-lobby-hero");
  if (friendHero) anchors.push({ parent: friendHero.parentElement, after: friendHero, compact: false, key: "friend-lobby" });

  anchors.forEach(({ parent, after, compact, key }) => {
    if (!parent || document.querySelector(`[data-ootpc-quick="${key}"]`)) return;
    const host = document.createElement("section");
    host.className = `ootpc-quick-host${compact ? " is-compact" : ""}`;
    host.dataset.ootpcQuick = key;
    host.innerHTML = quickCardMarkup({ compact });
    after.insertAdjacentElement("afterend", host);
    host.addEventListener("click", (event) => {
      if (event.target.closest("[data-ootpc-open]")) openModal();
    });
    state.quickCards.push({ host, compact });
  });
}

function renderQuickCards() {
  state.quickCards.forEach(({ host, compact }) => { host.innerHTML = quickCardMarkup({ compact }); });
}

async function refreshCard({ quiet = false } = {}) {
  if (!state.user || state.loading) return null;
  state.loading = true;
  try {
    const data = await rpc("oot_get_my_player_card");
    state.card = normalizeCard(data);
    renderQuickCards();
    if (state.modal && !state.modal.classList.contains("is-hidden")) renderModal();
    document.dispatchEvent(new CustomEvent("todayforest-oot-player-card-updated", { detail: state.card }));
    return state.card;
  } catch (error) {
    if (!quiet) console.warn("OneOfTen player card load error", error);
    return null;
  } finally {
    state.loading = false;
  }
}

async function saveProfile() {
  if (!state.user || state.saveBusy || !state.modal) return;
  const taglineInput = state.modal.querySelector("[data-ootpc-tagline]");
  const visibilityInput = state.modal.querySelector("[data-ootpc-visibility]");
  const saveButton = state.modal.querySelector("[data-ootpc-save]");
  const status = state.modal.querySelector("[data-ootpc-save-status]");
  const tagline = String(taglineInput?.value || "").trim().slice(0, 40);
  const visibility = visibilityInput?.value === "private" ? "private" : "friends";
  state.saveBusy = true;
  if (saveButton) { saveButton.disabled = true; saveButton.textContent = "저장 중…"; }
  try {
    await rpc("oot_update_my_player_profile", { p_tagline: tagline, p_stats_visibility: visibility });
    if (state.card) state.card.profile = { tagline, statsVisibility: visibility };
    if (status) status.textContent = "저장했어요. 다음에 열어도 그대로 보여요.";
    renderQuickCards();
  } catch (error) {
    console.warn("OneOfTen profile save error", error);
    if (status) status.textContent = "저장을 잠시 완료하지 못했어요. 다시 시도해 주세요.";
  } finally {
    state.saveBusy = false;
    if (saveButton) { saveButton.disabled = false; saveButton.textContent = "설정 저장"; }
  }
}

async function recordSolo(detail) {
  if (!state.user || !detail?.runId) return;
  const key = `squirrel:${detail.runId}`;
  if (state.recordedKeys.has(key)) return;
  state.recordedKeys.add(key);
  try {
    const payload = scorePayloadFromSolo(detail);
    await rpc("oot_record_squirrel_performance", {
      p_run_id: String(detail.runId),
      p_result: String(detail.result || "lose"),
      p_difficulty: String(detail.difficulty || "normal"),
      p_opponent_personality: String(detail.opponentPersonality || ""),
      p_payload: payload,
    });
    await refreshCard({ quiet: true });
  } catch (error) {
    state.recordedKeys.delete(key);
    console.warn("OneOfTen squirrel performance record skipped", error);
  }
}

async function recordPlayer(detail) {
  if (!state.user || !detail?.matchId) return;
  const key = `player:${detail.matchId}`;
  if (state.recordedKeys.has(key)) return;
  state.recordedKeys.add(key);
  try {
    const payload = scorePayloadFromPlayer({ ...detail, userId: state.user.id });
    await rpc("oot_record_player_match_performance", {
      p_match_id: String(detail.matchId),
      p_payload: payload,
    });
    await refreshCard({ quiet: true });
  } catch (error) {
    state.recordedKeys.delete(key);
    console.warn("OneOfTen player performance record skipped", error);
  }
}

function bindEvents() {
  document.addEventListener("todayforest-oot-solo-finished", (event) => { void recordSolo(event.detail || {}); });
  document.addEventListener("todayforest-oot-player-finished", (event) => { void recordPlayer(event.detail || {}); });
  document.addEventListener("todayforest-acorn-reward", () => { window.setTimeout(() => void refreshCard({ quiet: true }), 120); });
}

async function initialize() {
  createQuickCards();
  ensureModal();
  bindEvents();
  const { data, error } = await supabase.auth.getSession();
  if (error) console.warn("OneOfTen player card auth check skipped", error);
  state.user = data?.session?.user || null;
  renderQuickCards();
  if (state.user) await refreshCard();
}

window.TodayForestOneOfTenPlayerCard = {
  open: openModal,
  close: closeModal,
  refresh: () => refreshCard(),
  get card() { return state.card; },
};

void initialize();
