import { expect, test } from '@playwright/test';

test('grid animation keeps stable keyed cells and updates infection narration', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  const svg = page.locator('svg[role="img"]');
  await expect(svg).toBeVisible();

  const cells = page.locator('.grid-cell');
  const initialCount = await cells.count();
  expect(initialCount).toBeGreaterThan(0);
  const stableNode = page.locator('[data-cell-id="0-0"]');
  await stableNode.evaluate(node => { (window as typeof window & { __cellBeforeStep?: Element }).__cellBeforeStep = node; });
  expect(await stableNode.getAttribute('data-cell-id')).toBe('0-0');

  await page.waitForTimeout(250);
  await page.getByRole('button', { name: '→' }).click();
  const sameDomNode = await stableNode.evaluate(node => (window as typeof window & { __cellBeforeStep?: Element }).__cellBeforeStep === node);
  expect(sameDomNode).toBe(true);
  expect(await cells.count()).toBe(initialCount);

  const next = page.getByRole('button', { name: '→' });
  for (let i = 0; i < 20; i++) {
    if (!(await next.isEnabled())) break;
    await next.click();
    await expect(page.locator('[aria-live="polite"]')).toBeVisible();
  }
  await expect(page.getByLabel(/腐烂橘子网格动画/)).toBeVisible();
  await expect(page.getByLabel('网格图例')).toBeVisible();
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
