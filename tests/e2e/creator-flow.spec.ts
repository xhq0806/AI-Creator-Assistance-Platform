/**
 * E2E 测试 — 核心创作者流程
 *
 * 运行方式：
 *   npx playwright install
 *   npx playwright test tests/e2e/
 *
 * 需要先启动后端和前端服务：
 *   pnpm backend:dev
 *   pnpm dev
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8000";
const API_URL = process.env.API_BASE_URL || "http://localhost:3000";

test.describe("User Journey: Creator publishes an article", () => {
  const uniqueId = `e2e_${Date.now()}`;

  test.beforeAll(async ({ request }) => {
    // Register a test user via API
    const res = await request.post(`${API_URL}/api/v1/auth/register`, {
      data: {
        username: uniqueId,
        email: `${uniqueId}@test.com`,
        password: "E2eTest123",
      },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("1. Login page loads and allows login", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator("text=创作者账户中心")).toBeVisible();

    // Fill login form
    await page.fill('input[placeholder*="admin"]', uniqueId);
    await page.fill('input[type="password"]', "E2eTest123");
    await page.click('button:has-text("登录")');

    // Should redirect to creator page
    await page.waitForURL("**/creator**");
    await expect(page.locator("text=灵感创作工作台")).toBeVisible();
  });

  test("2. Creator workspace loads with toolbar", async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[placeholder*="admin"]', uniqueId);
    await page.fill('input[type="password"]', "E2eTest123");
    await page.click('button:has-text("登录")');
    await page.waitForURL("**/creator**");

    // Verify toolbar buttons
    await expect(page.locator('button:has-text("AI 生成")')).toBeVisible();
    await expect(page.locator('button:has-text("保存草稿")')).toBeVisible();
    await expect(page.locator('button:has-text("安全审核")')).toBeVisible();
    await expect(page.locator('button:has-text("质量评分")')).toBeVisible();
  });

  test("3. AI generates content from prompt", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[placeholder*="admin"]', uniqueId);
    await page.fill('input[type="password"]', "E2eTest123");
    await page.click('button:has-text("登录")');
    await page.waitForURL("**/creator**");

    // Type a prompt
    await page.fill('textarea[placeholder*="未来科技"]', "写一篇关于AI如何改变内容创作的短图文");

    // Click generate
    await page.click('button:has-text("AI 生成")');

    // Wait for content to appear (fallback response is fast)
    await page.waitForTimeout(3000);

    // Title and content should be filled
    const titleInput = page.locator('input[placeholder="输入图文标题"]');
    const titleValue = await titleInput.inputValue();
    expect(titleValue.length).toBeGreaterThan(0);
  });

  test("4. Save draft and publish", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[placeholder*="admin"]', uniqueId);
    await page.fill('input[type="password"]', "E2eTest123");
    await page.click('button:has-text("登录")');
    await page.waitForURL("**/creator**");

    // Generate content
    await page.fill('textarea[placeholder*="未来科技"]', "介绍人工智能发展趋势");
    await page.click('button:has-text("AI 生成")');
    await page.waitForTimeout(3000);

    // Select category
    await page.click('.ant-select >> text=请选择文章分类');
    await page.click('text=科技');

    // Save draft
    await page.click('button:has-text("保存草稿")');
    await page.waitForTimeout(1000);

    // Publish
    await page.click('button:has-text("审核并发布")');
    await page.waitForTimeout(5000);

    // Should navigate to article detail
    await expect(page.url()).toMatch(/\/article\/\d+/);
  });

  test("5. Hot feed shows published articles", async ({ page }) => {
    await page.goto(`${BASE_URL}/index`);
    await expect(page.locator("text=爆文发现") || page.locator("text=开始尽情创作吧")).toBeVisible();

    // Wait for feed to load
    await page.waitForTimeout(2000);
  });
});
