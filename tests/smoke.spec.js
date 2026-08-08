const { test, expect } = require("@playwright/test");

function observePage(page) {
  const localFailures = [];
  const pageErrors = [];
  const supabaseWrites = [];

  page.on("response", (response) => {
    const url = new URL(response.url());
    if (
      url.hostname === "127.0.0.1" &&
      response.status() >= 400 &&
      !url.pathname.endsWith("/favicon.ico")
    ) {
      localFailures.push(`${response.status()} ${url.pathname}`);
    }
  });

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  page.on("request", (request) => {
    const url = request.url();
    if (
      url.includes(".supabase.co/") &&
      !["GET", "HEAD", "OPTIONS"].includes(request.method())
    ) {
      supabaseWrites.push(`${request.method()} ${url}`);
    }
  });

  return () => {
    expect(localFailures, "로컬 파일/페이지 요청에 4xx·5xx가 없어야 합니다.").toEqual([]);
    expect(pageErrors, "브라우저 런타임 JavaScript 오류가 없어야 합니다.").toEqual([]);
    expect(
      supabaseWrites,
      "1차 smoke test는 Supabase 데이터를 변경하면 안 됩니다."
    ).toEqual([]);
  };
}

test("공개 홈이 열린다", async ({ page }) => {
  const verify = observePage(page);

  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveTitle(/오늘의숲/);
  await expect(page.locator("#publicHome")).toBeVisible();
  await expect(page.locator("#publicHeroTitle")).toBeVisible();

  verify();
});

test("DB를 쓰지 않는 손님맞이 미리보기가 열린다", async ({ page }) => {
  const verify = observePage(page);

  await page.goto("/app.html?welcomePreview=1", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveTitle(/오늘의숲/);
  await expect(page.locator("#welcomePreview")).toBeVisible();
  await expect(page.locator("#welcomePlantButton")).toBeAttached();
  await expect(page.locator("#welcomeNameForm")).toBeAttached();

  verify();
});

test("원오브텐 혼자 연습 화면으로 진입한다", async ({ page }) => {
  const verify = observePage(page);

  await page.goto("/one-of-ten.html", { waitUntil: "domcontentloaded" });

  await expect(page.locator("#modeGate")).toBeVisible();
  await expect(page.locator("#computerModeButton")).toBeVisible();

  await page.locator("#computerModeButton").click();

  await expect(page.locator("#computerGameArea")).toBeVisible();
  await expect(page.locator("#modeBadge")).toHaveText("다람쥐 대전");

  verify();
});

test("관리자 페이지는 비로그인 상태에서 통계를 노출하지 않는다", async ({ page }) => {
  const verify = observePage(page);

  await page.goto("/admin.html", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveTitle(/운영 통계/);
  await expect(page.locator("#authScreen")).toBeVisible();
  await expect(page.locator("#signInKakao")).toBeVisible();
  await expect(page.locator("#adminApp")).toHaveClass(/hidden/);

  verify();
});
