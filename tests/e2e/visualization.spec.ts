import { expect, test } from '@playwright/test';

test('grid animation keeps stable keyed cells and updates infection narration', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  const svg = page.locator('svg[role="img"]');
  await expect(svg).toBeVisible();

  await page.getByRole('button', { name: /示例 1/ }).click();
  const cells = page.locator('.grid-cell');
  await expect(cells).toHaveCount(9);
  const initialCount = await cells.count();
  const stableNode = page.locator('[data-cell-id="0-0"]');
  await stableNode.evaluate(node => { (window as typeof window & { __cellBeforeStep?: Element }).__cellBeforeStep = node; });
  expect(await stableNode.getAttribute('data-cell-id')).toBe('0-0');

  await page.waitForTimeout(250);
  await page.getByRole('button', { name: '→' }).click();
  const sameDomNode = await stableNode.evaluate(node => (window as typeof window & { __cellBeforeStep?: Element }).__cellBeforeStep === node);
  expect(sameDomNode).toBe(true);
  expect(await cells.count()).toBe(initialCount);

  const dimensions = await page.locator('svg[role="img"]').getAttribute('viewBox');
  const svgBounds = await page.locator('svg[role="img"]').evaluate(svg => svg.getBoundingClientRect().toJSON());
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[aria-live="polite"]')).toBeVisible();
    expect(await page.locator('svg[role="img"]').getAttribute('viewBox')).toBe(dimensions);
    expect(await page.locator('svg[role="img"]').evaluate(svg => svg.getBoundingClientRect().toJSON())).toEqual(svgBounds);
    expect(await cells.count()).toBe(initialCount);
  }
  await expect(page.getByLabel(/腐烂橘子网格动画/)).toBeVisible();
  await expect(page.getByLabel('网格图例与当前步骤解说')).toBeVisible();
  await expect(page.getByLabel('网格图例', { exact: true })).toBeVisible();
  const canvas = svg.locator('xpath=ancestor::div[@style and contains(@style, "cursor: grab")]');
  const legend = page.getByLabel('网格图例', { exact: true });
  expect(await legend.evaluate(el => el.getBoundingClientRect().left)).toBeGreaterThan(await canvas.evaluate(el => el.getBoundingClientRect().right));
  await expect(page.locator('.step-narration')).toContainText(/第/);
});

test('grid animation honors reduced-motion preference and has no purple wave colors', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const motion = await page.locator('body').evaluate(el => parseFloat(getComputedStyle(el).animationDuration));
  expect(motion).toBeLessThanOrEqual(0.00001);

  const purpleTokens = await page.locator('body').evaluate(el => {
    const styleText = Array.from(document.querySelectorAll('style')).map(style => style.textContent || '').join(' ');
    return /purple|violet|#a78bfa|#8b5cf6/i.test(`${styleText} ${el.innerHTML}`);
  });
  expect(purpleTokens).toBe(false);
});
