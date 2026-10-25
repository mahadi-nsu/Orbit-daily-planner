import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
async function navigate(page: Page, name: string) {
  await expect(page.locator('.app-shell')).toBeVisible();
  const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('button', { name, exact: true }).click();
}

test('weekly targets organize hours and editable study checklists with persistent progress', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await navigate(page, 'Routine planner');
  await page.getByRole('button', { name: 'New routine', exact: true }).click();
  await page.getByLabel('Routine name', { exact: true }).fill('My focused week');
  await page.getByRole('button', { name: 'Create routine', exact: true }).click();
  await expect(page.locator('.routine-selector')).toContainText('7 days');
  for (const [area, hours] of [
    ['Frontend', '4'],
    ['Backend', '3'],
    ['Artificial intelligence', '2'],
  ]) {
    await page.getByRole('button', { name: 'Add learning target', exact: true }).click();
    await page.getByLabel('Learning area', { exact: true }).selectOption({ label: area });
    await page.getByLabel('Target hours', { exact: true }).fill(hours);
    await page.getByRole('button', { name: 'Add target', exact: true }).click();
    await expect(page.getByRole('region', { name: `${area} target`, exact: true })).toBeVisible();
  }
  const frontend = page.getByRole('region', { name: 'Frontend target', exact: true });
  for (const title of ['CSS Grid practice', 'React state', 'TypeScript types']) {
    await frontend
      .getByRole('textbox', { name: 'New study topic for Frontend', exact: true })
      .fill(title);
    await frontend.getByRole('button', { name: 'Add topic', exact: true }).click();
    await expect(
      frontend.getByRole('button', { name: `Edit study topic: ${title}`, exact: true }),
    ).toBeVisible();
  }
  await page
    .getByRole('combobox', { name: 'Study status for React state', exact: true })
    .selectOption('in-progress');
  await page
    .getByRole('checkbox', { name: 'Complete study topic: CSS Grid practice', exact: true })
    .check();
  await expect(
    page.getByRole('checkbox', { name: 'Reopen study topic: CSS Grid practice', exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole('progressbar', { name: 'Focus time for Frontend', exact: true }),
  ).toHaveAttribute('aria-valuenow', '0');
  await frontend.getByRole('button', { name: 'Edit target: Frontend', exact: true }).click();
  await page.getByLabel('Target hours', { exact: true }).fill('4.5');
  await page.getByRole('button', { name: 'Save target', exact: true }).click();
  await expect(frontend.locator('.routine-target-budget')).toContainText('4.5h');
  await expect(frontend.getByRole('listitem')).toHaveCount(3);
  await page
    .getByRole('button', { name: 'Edit study topic: TypeScript types', exact: true })
    .click();
  await page.getByLabel('What will you study?', { exact: true }).fill('TypeScript narrowing');
  await page.getByRole('button', { name: 'Save study topic', exact: true }).click();
  await page.reload();
  await expect(frontend.getByRole('listitem')).toHaveCount(3);
  await expect(
    page.getByRole('combobox', { name: 'Study status for React state', exact: true }),
  ).toHaveValue('in-progress');
  await expect(
    page.getByRole('checkbox', { name: 'Reopen study topic: CSS Grid practice', exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole('button', { name: 'Edit study topic: TypeScript narrowing', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.main-content')).toHaveCSS('opacity', '1');
  await page.screenshot({
    path: `test-results/orbit-weekly-plan-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Routine options', exact: true }).click();
  await page.getByRole('button', { name: 'Duplicate routine', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Select routine', exact: true })).toContainText(
    'My focused week (copy)',
  );
  await expect(
    page.getByRole('combobox', { name: 'Study status for CSS Grid practice', exact: true }),
  ).toHaveValue('todo');
  await expect(
    page.getByRole('combobox', { name: 'Study status for React state', exact: true }),
  ).toHaveValue('todo');
  await page.getByRole('button', { name: 'Routine options', exact: true }).click();
  await page.getByRole('button', { name: 'Delete routine', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete permanently', exact: true })
    .click();
  await expect(
    page.getByRole('checkbox', { name: 'Reopen study topic: CSS Grid practice', exact: true }),
  ).toBeChecked();
  await page
    .getByRole('button', { name: 'Remove study topic: TypeScript narrowing', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Remove study topic', exact: true })
    .click();
  await expect(frontend.getByRole('listitem')).toHaveCount(2);
  const downloadPromise = page.waitForEvent('download');
  await navigate(page, 'Workspace settings');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  const path = await (await downloadPromise).path();
  await page.locator('input[type=file]').setInputFiles(path!);
  await page.getByLabel('Import behavior').selectOption('replace');
  await page.getByLabel('Type REPLACE to confirm').fill('REPLACE');
  await page.getByRole('button', { name: 'Restore workspace', exact: true }).click();
  await expect(page.getByText('Your workspace has been restored.', { exact: true })).toBeVisible();
  await navigate(page, 'Routine planner');
  await expect(frontend.getByRole('listitem')).toHaveCount(2);
  await expect(frontend.locator('.routine-target-budget')).toContainText('4.5h');
  await page.getByRole('button', { name: 'Remove target: Backend', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Remove target', exact: true })
    .click();
  await expect(page.getByRole('region', { name: 'Backend target', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('adds learning areas inside the target form while preserving hours, names, and study items', async ({
  page,
}, testInfo) => {
  await navigate(page, 'Routine planner');
  await page.getByRole('button', { name: 'New routine', exact: true }).click();
  await page.getByLabel('Routine name', { exact: true }).fill('My design week');
  await page.getByRole('button', { name: 'Create routine', exact: true }).click();
  await page.getByRole('button', { name: 'Add learning target', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'What will you focus on?', exact: true });
  await form.getByLabel('Target name', { exact: true }).fill('Design practice');
  await form.getByLabel('Target hours', { exact: true }).fill('3.5');
  await form.getByRole('button', { name: 'New learning area', exact: true }).click();
  await form.getByLabel('New learning area name', { exact: true }).fill('Cancelled area');
  await form.getByRole('button', { name: 'Cancel area', exact: true }).click();
  await expect(
    form
      .getByLabel('Learning area', { exact: true })
      .getByRole('option', { name: 'Cancelled area', exact: true }),
  ).toHaveCount(0);
  await form.getByRole('button', { name: 'New learning area', exact: true }).click();
  await form.getByLabel('New learning area name', { exact: true }).fill('System design');
  await form.getByRole('button', { name: 'Choose #74c7cb', exact: true }).click();
  await form.getByLabel('New learning area name', { exact: true }).press('Enter');
  await expect(
    form.getByLabel('Learning area', { exact: true }).locator('option:checked'),
  ).toHaveText('System design');
  await expect(form.getByLabel('Target name', { exact: true })).toHaveValue('Design practice');
  await expect(form.getByLabel('Target hours', { exact: true })).toHaveValue('3.5');
  await form.getByRole('button', { name: 'New learning area', exact: true }).click();
  await form.getByLabel('New learning area name', { exact: true }).fill('system design');
  await form.getByRole('button', { name: 'Add learning area', exact: true }).click();
  await expect(
    form
      .getByLabel('Learning area', { exact: true })
      .getByRole('option', { name: 'System design', exact: true }),
  ).toHaveCount(1);
  await form.screenshot({
    path: `test-results/orbit-routine-new-area-${testInfo.project.name}.png`,
  });
  await form.getByRole('button', { name: 'Add target', exact: true }).click();
  const target = page.getByRole('region', { name: 'Design practice target', exact: true });
  await expect(target.locator('.routine-target-budget')).toContainText('3.5h');
  await target
    .getByRole('textbox', { name: 'New study topic for Design practice', exact: true })
    .fill('Caching strategies');
  await target.getByRole('button', { name: 'Add topic', exact: true }).click();
  await target.getByRole('button', { name: 'Edit target: Design practice', exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Edit learning target', exact: true });
  await edit.getByRole('button', { name: 'New learning area', exact: true }).click();
  await edit.getByLabel('New learning area name', { exact: true }).fill('Architecture');
  await edit.getByRole('button', { name: 'Add learning area', exact: true }).click();
  await expect(edit.getByLabel('Target name', { exact: true })).toHaveValue('Design practice');
  await edit.getByRole('button', { name: 'Save target', exact: true }).click();
  await page.reload();
  await expect(target.getByRole('listitem')).toHaveCount(1);
  await target.getByRole('button', { name: 'Edit target: Design practice', exact: true }).click();
  await expect(
    edit.getByLabel('Learning area', { exact: true }).locator('option:checked'),
  ).toHaveText('Architecture');
  await expect(edit.getByLabel('Target hours', { exact: true })).toHaveValue('3.5');
  await edit.getByRole('button', { name: 'Cancel', exact: true }).click();
  await navigate(page, 'Learning library');
  await expect(
    page.locator('.library-category > header').filter({ hasText: 'Architecture' }),
  ).toBeVisible();
});
