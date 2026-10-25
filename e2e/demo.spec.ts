import { test, expect, type Page } from '@playwright/test';
async function navigate(page: Page, name: string) {
  await expect(page.locator('.app-shell')).toBeVisible();
  const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('button', { name, exact: true }).click();
}

test('demo populates every workspace view, reads notes, and stays consistent across reloads', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Edit task: Build a small React task card', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('combobox', { name: 'Status for Build a small React task card' }),
  ).toHaveValue('in-progress');
  await expect(page.getByRole('region', { name: 'In progress', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'To do', exact: true })).toBeVisible();
  await expect(page.getByText('Also in your learning routine', { exact: true })).toHaveCount(0);
  await expect(
    page.getByText('A place for the everyday things. Saved on this device.', { exact: true }),
  ).toHaveCount(0);
  await page.getByRole('textbox', { name: 'New task', exact: true }).fill('Keep my own task');
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Edit task: Keep my own task', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.main-content')).toHaveCSS('opacity', '1');
  await page.screenshot({
    path: `test-results/orbit-demo-tasks-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await navigate(page, 'Learning library');
  await expect(
    page.getByRole('heading', { name: 'Your knowledge, connected.', exact: true }),
  ).toBeVisible();
  await page.locator('.library-topic-name').filter({ hasText: 'React foundations' }).click();
  await expect(page.getByRole('document', { name: 'Saved learning notes' })).toContainText(
    'Things to practise',
  );
  await expect(page.getByText('React: learn the basics', { exact: true })).toBeVisible();
  await expect(page.locator('.main-content')).toHaveCSS('opacity', '1');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `test-results/orbit-demo-notes-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await navigate(page, 'Learning library');
  await expect(
    page.getByRole('heading', { name: 'Your knowledge, connected.', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('React foundations', { exact: true }).last()).toBeVisible();
  await expect(page.locator('.main-content')).toHaveCSS('opacity', '1');
  await page.screenshot({
    path: `test-results/orbit-demo-library-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await navigate(page, 'Routine planner');
  await expect(page.getByRole('combobox', { name: 'Select routine' })).toContainText(
    'A balanced learning week',
  );
  await expect(page.getByRole('region', { name: 'Frontend target', exact: true })).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Frontend target', exact: true })
      .locator('.routine-target-budget'),
  ).toContainText('4h');
  await expect(page.locator('.main-content')).toHaveCSS('opacity', '1');
  await page.screenshot({
    path: `test-results/orbit-demo-routine-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await navigate(page, 'Your progress');
  await expect(
    page
      .getByText('Practised passing props and callbacks. (Demo session)', { exact: true })
      .first(),
  ).toHaveText('Practised passing props and callbacks. (Demo session)');
  await expect(page.locator('.focus-history-table > button')).toHaveCount(12);
  await expect(page.locator('.main-content')).toHaveCSS('opacity', '1');
  await page.screenshot({
    path: `test-results/orbit-demo-progress-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await navigate(page, 'Workspace settings');
  await page.getByRole('button', { name: 'Remove demo data', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Remove demo data', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Load demo data', exact: true })).toBeVisible();
  await navigate(page, 'My day');
  await expect(
    page.getByRole('button', { name: 'Edit task: Keep my own task', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Edit task: Build a small React task card', exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Edit task: Build a small React task card', exact: true }),
  ).toHaveCount(0);
  await navigate(page, 'Workspace settings');
  await page.getByRole('button', { name: 'Load demo data', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remove demo data', exact: true })).toBeVisible();
  await navigate(page, 'My day');
  await expect(
    page.getByRole('button', { name: 'Edit task: Build a small React task card', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
