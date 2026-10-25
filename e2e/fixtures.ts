import { test as base, expect } from '@playwright/test';

// Most workflow tests exercise a clean personal workspace. Remove the sample
// pack through its real UI so they don't depend on the number of demo records.
export const test = base.extend({
  page: async ({ page }, providePage) => {
    await page.goto('/settings');
    const remove = page.getByRole('button', { name: 'Remove demo data', exact: true });
    await expect(remove).toBeVisible();
    await remove.click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Remove demo data', exact: true })
      .click();
    await expect(page.getByRole('button', { name: 'Load demo data', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Load demo data', exact: true })).toBeVisible();
    await providePage(page);
  },
});
export { expect };
