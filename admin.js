const TODAYFOREST_STATS_ENDPOINT = "https://script.google.com/macros/s/AKfycbyeqnUwroduXytKBFMs9Tpl2gngoJ0f6JmF9oKbEA-QAoJY0aFJ-bvOUWS15SFeErgkiA/exec";
const TODAYFOREST_STATS_KEY = "living_forest_v1";

const els = {
  refreshButton: document.querySelector("#refreshButton"),
  statusLine: document.querySelector("#statusLine"),
  moodCount: document.querySelector("#moodCount"),
  letterCount: document.querySelector("#letterCount"),
  friendCount: document.querySelector("#friendCount"),
  rangeButtons: [...document.querySelectorAll("[data-range]")],
};

let selectedRange = "all";

function loadJsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = `todayforestStats_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const script = document.createElement("script");
    const cleanup = () => {
      delete window[callbackName];
      script.remove();
    };

    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("통계 요청을 불러오지 못했어요."));
    };

    const requestUrl = new URL(url);
    requestUrl.searchParams.set("callback", callbackName);
    script.src = requestUrl.toString();
    document.body.appendChild(script);
  });
}

function numberFromSummary(summary, key) {
  const value = Number(summary?.[key] || 0);
  return Number.isFinite(value) ? value : 0;
}

function updateSelectedRangeButton() {
  els.rangeButtons.forEach((button) => {
    button.classList.toggle("selected", button.dataset.range === selectedRange);
  });
}

async function refreshStats() {
  els.refreshButton.disabled = true;
  els.statusLine.textContent = "통계를 불러오는 중이에요.";

  try {
    const url = new URL(TODAYFOREST_STATS_ENDPOINT);
    url.searchParams.set("action", "todayforest_summary");
    url.searchParams.set("key", TODAYFOREST_STATS_KEY);
    url.searchParams.set("range", selectedRange);

    const data = await loadJsonp(url.toString());
    if (!data?.ok) throw new Error(data?.error || "summary_unavailable");

    const summary = data.summary || data;
    els.moodCount.textContent = String(numberFromSummary(summary, "garden_mood_saved"));
    els.letterCount.textContent = String(numberFromSummary(summary, "garden_letter_sent"));
    els.friendCount.textContent = String(numberFromSummary(summary, "garden_friend_connected"));

    const updatedAt = data.updatedAt || data.updated_at || "";
    els.statusLine.textContent = updatedAt ? `마지막 갱신 · ${updatedAt}` : "통계를 불러왔어요.";
  } catch (error) {
    console.error("TodayForest stats load error:", error);
    els.statusLine.textContent = "통계를 불러오지 못했어요. 잠시 뒤 다시 눌러 주세요.";
  } finally {
    els.refreshButton.disabled = false;
  }
}

els.refreshButton.addEventListener("click", () => { void refreshStats(); });
els.rangeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedRange = button.dataset.range || "all";
    updateSelectedRangeButton();
    void refreshStats();
  });
});

updateSelectedRangeButton();
void refreshStats();
