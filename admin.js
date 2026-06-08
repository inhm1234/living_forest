const ADMIN_PASSWORD = "forest2026";
const SESSION_KEY = "livingForestAdminUnlocked";

// 다음 단계에서 Google Apps Script 웹 앱 URL을 여기에 넣습니다.
// 예: const ADMIN_DATA_ENDPOINT = "https://script.google.com/macros/s/....../exec";
const ADMIN_DATA_ENDPOINT = "";
const ADMIN_DATA_KEY = "living_forest_v1";

const loginPanel = document.querySelector("#loginPanel");
const dashboardPanel = document.querySelector("#dashboardPanel");
const adminPasswordInput = document.querySelector("#adminPassword");
const loginButton = document.querySelector("#loginButton");
const logoutButton = document.querySelector("#logoutButton");
const refreshButton = document.querySelector("#refreshButton");
const loginMessage = document.querySelector("#loginMessage");

const statusTitle = document.querySelector("#statusTitle");
const statusText = document.querySelector("#statusText");
const analysisText = document.querySelector("#analysisText");

const valueElements = {
  visitors: document.querySelector("#visitorsValue"),
  goGarden: document.querySelector("#gardenClickValue"),
  nameSaved: document.querySelector("#nameSaveValue"),
  moodRecorded: document.querySelector("#moodRecordValue"),
  shareClick: document.querySelector("#shareClickValue"),
  returnVisit: document.querySelector("#returnVisitValue"),
  gardenRate: document.querySelector("#gardenRateValue"),
  nameRate: document.querySelector("#nameRateValue"),
  moodRate: document.querySelector("#moodRateValue"),
  shareRate: document.querySelector("#shareRateValue"),
};

function showDashboard() {
  loginPanel.classList.add("hidden");
  dashboardPanel.classList.remove("hidden");
  loadDashboardData();
}

function showLogin() {
  dashboardPanel.classList.add("hidden");
  loginPanel.classList.remove("hidden");
  adminPasswordInput.focus();
}

function handleLogin() {
  const input = adminPasswordInput.value.trim();

  if (input === ADMIN_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, "yes");
    loginMessage.textContent = "";
    showDashboard();
    return;
  }

  loginMessage.textContent = "비밀번호가 맞지 않습니다.";
  adminPasswordInput.select();
}

function handleLogout() {
  sessionStorage.removeItem(SESSION_KEY);
  adminPasswordInput.value = "";
  showLogin();
}

function formatNumber(value) {
  if (value === undefined || value === null || value === "") {
    return "0";
  }
  return Number(value).toLocaleString("ko-KR");
}

function formatRate(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "-";
  }
  return `${Number(value).toFixed(1)}%`;
}

function safeDivideRate(numerator, denominator) {
  const num = Number(numerator || 0);
  const den = Number(denominator || 0);
  if (!den) {
    return 0;
  }
  return (num / den) * 100;
}

function setLoadingState(message = "데이터를 불러오는 중입니다.") {
  statusTitle.textContent = "불러오는 중";
  statusText.textContent = message;
}

function setDisconnectedState() {
  statusTitle.textContent = "연결 준비중";
  statusText.textContent = "아직 Apps Script 웹 앱 URL이 연결되지 않았습니다. 다음 단계에서 URL을 넣으면 실제 숫자가 자동 표시됩니다.";
}

function setErrorState(error) {
  statusTitle.textContent = "데이터 연결 오류";
  statusText.textContent = `데이터를 불러오지 못했습니다. ${error?.message || "Apps Script URL 또는 배포 권한을 확인하세요."}`;
}

function applyDashboardData(data) {
  const summary = data?.summary || {};
  const visitors = Number(summary.visitors || 0);
  const goGarden = Number(summary.go_garden_click || 0);
  const nameSaved = Number(summary.tree_name_saved || 0);
  const moodRecorded = Number(summary.mood_recorded || 0);
  const shareClick = Number(summary.share_click || 0);
  const returnVisit = Number(summary.return_visit || 0);

  valueElements.visitors.textContent = formatNumber(visitors);
  valueElements.goGarden.textContent = formatNumber(goGarden);
  valueElements.nameSaved.textContent = formatNumber(nameSaved);
  valueElements.moodRecorded.textContent = formatNumber(moodRecorded);
  valueElements.shareClick.textContent = formatNumber(shareClick);
  valueElements.returnVisit.textContent = formatNumber(returnVisit);

  const gardenRate = safeDivideRate(goGarden, visitors);
  const nameRate = safeDivideRate(nameSaved, visitors);
  const moodRate = safeDivideRate(moodRecorded, visitors);
  const shareRate = safeDivideRate(shareClick, visitors);

  valueElements.gardenRate.textContent = formatRate(gardenRate);
  valueElements.nameRate.textContent = formatRate(nameRate);
  valueElements.moodRate.textContent = formatRate(moodRate);
  valueElements.shareRate.textContent = formatRate(shareRate);

  statusTitle.textContent = "자동 데이터 연결됨";
  statusText.textContent = `${data?.date || "오늘"} 기준 데이터입니다. 마지막 업데이트: ${data?.updatedAt || "확인 중"}`;

  if (visitors === 0) {
    analysisText.textContent = "아직 오늘 방문 데이터가 없습니다. 먼저 일반 페이지에서 접속과 감정 기록 테스트를 해보세요.";
  } else if (moodRate >= 30) {
    analysisText.textContent = `감정 기록률 ${moodRate.toFixed(1)}%로 초기 흐름은 괜찮습니다. 다음 목표는 재방문과 공유 클릭을 확인하는 것입니다.`;
  } else if (moodRate >= 15) {
    analysisText.textContent = `감정 기록률 ${moodRate.toFixed(1)}%입니다. 첫 화면에서 내 정원으로 들어가는 이유와 감정 기록 유도 문구를 더 점검해야 합니다.`;
  } else {
    analysisText.textContent = `감정 기록률 ${moodRate.toFixed(1)}%로 낮습니다. 방문자는 들어오지만 핵심 행동까지 이어지지 않는지 확인해야 합니다.`;
  }
}

function loadJsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = `livingForestAdminCallback_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const script = document.createElement("script");

    window[callbackName] = (data) => {
      resolve(data);
      cleanup();
    };

    function cleanup() {
      delete window[callbackName];
      script.remove();
    }

    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP 로드 실패"));
    };

    const finalUrl = new URL(url);
    finalUrl.searchParams.set("action", "summary");
    finalUrl.searchParams.set("key", ADMIN_DATA_KEY);
    finalUrl.searchParams.set("callback", callbackName);

    script.src = finalUrl.toString();
    document.body.appendChild(script);
  });
}

async function loadDashboardData() {
  if (!ADMIN_DATA_ENDPOINT) {
    setDisconnectedState();
    return;
  }

  try {
    setLoadingState();
    const data = await loadJsonp(ADMIN_DATA_ENDPOINT);
    applyDashboardData(data);
  } catch (error) {
    setErrorState(error);
  }
}

loginButton.addEventListener("click", handleLogin);
logoutButton.addEventListener("click", handleLogout);
refreshButton.addEventListener("click", loadDashboardData);

adminPasswordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleLogin();
  }
});

if (sessionStorage.getItem(SESSION_KEY) === "yes") {
  showDashboard();
} else {
  showLogin();
}
